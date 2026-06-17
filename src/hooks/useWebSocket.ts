import { useRef, useCallback, useEffect } from 'react';
import type {
  WSMessage,
  WSMessageType,
  PositionUpdateMessage,
  FenceEventMessage,
  OnlineUsersMessage,
} from '../../shared/types';

type EventHandler = (data: unknown) => void;

interface WebSocketHook {
  connect: (userId: string) => void;
  disconnect: () => void;
  sendPosition: (lat: number, lng: number) => void;
  subscribeUser: (userId: string) => void;
  unsubscribeUser: (userId: string) => void;
  on: (event: WSMessageType, handler: EventHandler) => void;
  off: (event: WSMessageType, handler: EventHandler) => void;
  isConnected: boolean;
}

const WS_URL = 'ws://localhost:3001/ws';

export function useWebSocket(): WebSocketHook {
  const wsRef = useRef<WebSocket | null>(null);
  const userIdRef = useRef<string>('');
  const eventHandlersRef = useRef<Map<WSMessageType, Set<EventHandler>>>(new Map());
  const isConnectedRef = useRef<boolean>(false);

  const on = useCallback((event: WSMessageType, handler: EventHandler) => {
    if (!eventHandlersRef.current.has(event)) {
      eventHandlersRef.current.set(event, new Set());
    }
    eventHandlersRef.current.get(event)!.add(handler);
  }, []);

  const off = useCallback((event: WSMessageType, handler: EventHandler) => {
    const handlers = eventHandlersRef.current.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }, []);

  const emit = useCallback((event: WSMessageType, data: unknown) => {
    const handlers = eventHandlersRef.current.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }, []);

  const connect = useCallback((userId: string) => {
    userIdRef.current = userId;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      isConnectedRef.current = true;
      emit('online:users', []);
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'position:update':
            emit('position:update', message as PositionUpdateMessage);
            break;
          case 'fence:event':
            emit('fence:event', message as FenceEventMessage);
            break;
          case 'online:users':
            emit('online:users', message as OnlineUsersMessage);
            break;
          case 'error':
            emit('error', message);
            break;
          default:
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      isConnectedRef.current = false;
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      isConnectedRef.current = false;
    };
  }, [emit]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      isConnectedRef.current = false;
    }
  }, []);

  const sendPosition = useCallback((lat: number, lng: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && userIdRef.current) {
      const message = {
        type: 'position:report',
        userId: userIdRef.current,
        lat,
        lng,
        timestamp: Date.now(),
      };
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const subscribeUser = useCallback((userId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = {
        type: 'subscribe:user',
        userId,
      };
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const unsubscribeUser = useCallback((userId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = {
        type: 'unsubscribe:user',
        userId,
      };
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    connect,
    disconnect,
    sendPosition,
    subscribeUser,
    unsubscribeUser,
    on,
    off,
    isConnected: isConnectedRef.current,
  };
}
