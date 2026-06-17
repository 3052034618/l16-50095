import { WebSocketServer, type WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import { updateUserLocation, removeUser, getOnlineUsers } from './services/locationService.js';
import { addTrackPoint } from './services/trackService.js';
import { checkFenceEvents } from './services/fenceService.js';
import type {
  WSMessage,
  PositionReportMessage,
  PositionUpdateMessage,
  OnlineUsersMessage,
  FenceEventMessage,
} from '../shared/types.js';

interface ClientData {
  userId: string;
  subscriptions: Set<string>;
}

const clients = new Map<WebSocket, ClientData>();

export function setupWebSocket(server: HttpServer): void {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection');

    ws.on('message', (data: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        sendError(ws, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      const clientData = clients.get(ws);
      if (clientData) {
        console.log(`User ${clientData.userId} disconnected`);
        removeUser(clientData.userId);
        broadcastOnlineUsers();
        clients.delete(ws);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  console.log('WebSocket server ready on /ws');
}

function handleMessage(ws: WebSocket, message: WSMessage): void {
  switch (message.type) {
    case 'position:report':
      handlePositionReport(ws, message as PositionReportMessage);
      break;
    case 'subscribe:user':
      handleSubscribeUser(ws, message.userId as string);
      break;
    case 'unsubscribe:user':
      handleUnsubscribeUser(ws, message.userId as string);
      break;
    case 'online:users':
      sendOnlineUsers(ws);
      break;
    default:
      console.warn('Unknown message type:', message.type);
  }
}

function handlePositionReport(ws: WebSocket, msg: PositionReportMessage): void {
  const { userId, lat, lng, timestamp } = msg;

  if (!clients.has(ws)) {
    clients.set(ws, {
      userId,
      subscriptions: new Set(),
    });
  }

  const clientData = clients.get(ws)!;
  if (clientData.userId !== userId) {
    clientData.userId = userId;
  }

  updateUserLocation(userId, lat, lng, timestamp);

  addTrackPoint(userId, lat, lng, timestamp);

  const events = checkFenceEvents(userId, lat, lng, timestamp);
  if (events.length > 0) {
    events.forEach((event) => {
      broadcastFenceEvent(event);
    });
  }

  broadcastPositionUpdate(userId, lat, lng, timestamp);
  broadcastOnlineUsers();
}

function handleSubscribeUser(ws: WebSocket, userId: string): void {
  const clientData = clients.get(ws);
  if (clientData) {
    clientData.subscriptions.add(userId);
  }
}

function handleUnsubscribeUser(ws: WebSocket, userId: string): void {
  const clientData = clients.get(ws);
  if (clientData) {
    clientData.subscriptions.delete(userId);
  }
}

function broadcastPositionUpdate(
  userId: string,
  lat: number,
  lng: number,
  timestamp: number
): void {
  const message: PositionUpdateMessage = {
    type: 'position:update',
    userId,
    lat,
    lng,
    timestamp,
  };

  const messageStr = JSON.stringify(message);

  for (const [ws, data] of clients.entries()) {
    if (data.subscriptions.has(userId) || data.userId === userId) {
      if (ws.readyState === 1) {
        ws.send(messageStr);
      }
    }
  }
}

function broadcastOnlineUsers(): void {
  const users = getOnlineUsers();
  const message: OnlineUsersMessage = {
    type: 'online:users',
    users: users.map((u) => ({
      userId: u.userId,
      lat: u.lat,
      lng: u.lng,
      name: u.name,
    })),
  };

  const messageStr = JSON.stringify(message);

  for (const [ws] of clients.entries()) {
    if (ws.readyState === 1) {
      ws.send(messageStr);
    }
  }
}

function broadcastFenceEvent(event: {
  fenceId: string;
  fenceName: string;
  userId: string;
  action: 'enter' | 'leave';
  timestamp: number;
  lat: number;
  lng: number;
}): void {
  const message: FenceEventMessage = {
    type: 'fence:event',
    fenceId: event.fenceId,
    fenceName: event.fenceName,
    userId: event.userId,
    action: event.action,
    timestamp: event.timestamp,
    lat: event.lat,
    lng: event.lng,
  };

  const messageStr = JSON.stringify(message);

  for (const [ws] of clients.entries()) {
    if (ws.readyState === 1) {
      ws.send(messageStr);
    }
  }
}

function sendOnlineUsers(ws: WebSocket): void {
  const users = getOnlineUsers();
  const message: OnlineUsersMessage = {
    type: 'online:users',
    users: users.map((u) => ({
      userId: u.userId,
      lat: u.lat,
      lng: u.lng,
      name: u.name,
    })),
  };

  if (ws.readyState === 1) {
    ws.send(JSON.stringify(message));
  }
}

function sendError(ws: WebSocket, errorMsg: string): void {
  if (ws.readyState === 1) {
    ws.send(
      JSON.stringify({
        type: 'error',
        message: errorMsg,
      })
    );
  }
}
