import { useEffect, useRef } from 'react';
import { useLocationStore } from '@/store/useLocationStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import type {
  PositionUpdateMessage,
  FenceEventMessage,
  OnlineUsersMessage,
  UserLocation,
} from '../../shared/types';

const CURRENT_USER_ID = 'current_user';
const CURRENT_USER_NAME = '我';
const BEIJING_CENTER: [number, number] = [39.9042, 116.4074];

export default function WebSocketProvider() {
  const {
    addOrUpdateUser,
    addFenceEvent,
    addNotification,
    setConnected,
    setSubscribedUser,
    subscribedUserId,
    setCurrentPosition,
    currentPosition,
    setCurrentUser,
  } = useLocationStore();

  const { connect, disconnect, sendPosition, subscribeUser, unsubscribeUser, on, off } =
    useWebSocket();

  const subscribedRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    subscribedRef.current = subscribedUserId;
  }, [subscribedUserId]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      setCurrentUser(CURRENT_USER_ID);
      setCurrentPosition(BEIJING_CENTER[0], BEIJING_CENTER[1]);

      const currentUser: UserLocation = {
        userId: CURRENT_USER_ID,
        name: CURRENT_USER_NAME,
        lat: BEIJING_CENTER[0],
        lng: BEIJING_CENTER[1],
        timestamp: Date.now(),
        online: true,
      };
      addOrUpdateUser(currentUser);
    }
  }, [setCurrentUser, setCurrentPosition, addOrUpdateUser]);

  useEffect(() => {
    const handlePositionUpdate = (data: unknown) => {
      const msg = data as PositionUpdateMessage;
      if (msg.userId === CURRENT_USER_ID) {
        setCurrentPosition(msg.lat, msg.lng);
        return;
      }

      addOrUpdateUser({
        userId: msg.userId,
        name: (msg as unknown as { name?: string }).name || msg.userId,
        lat: msg.lat,
        lng: msg.lng,
        timestamp: msg.timestamp,
        online: true,
      });

      if (subscribedRef.current === msg.userId) {
        setCurrentPosition(msg.lat, msg.lng);
      }
    };

    const handleOnlineUsers = (data: unknown) => {
      const msg = data as OnlineUsersMessage;
      if (msg.users && Array.isArray(msg.users)) {
        msg.users.forEach((u) => {
          if (u.userId !== CURRENT_USER_ID) {
            addOrUpdateUser({
              userId: u.userId,
              name: u.name || u.userId,
              lat: u.lat,
              lng: u.lng,
              timestamp: Date.now(),
              online: true,
            });
          }
        });
      }
    };

    const handleFenceEvent = (data: unknown) => {
      const msg = data as FenceEventMessage;

      const event = {
        id: Date.now() + Math.random(),
        fenceId: msg.fenceId,
        fenceName: msg.fenceName,
        userId: msg.userId,
        action: msg.action,
        timestamp: msg.timestamp,
        lat: msg.lat,
        lng: msg.lng,
      };

      addFenceEvent(event);

      const isCurrentUser = msg.userId === CURRENT_USER_ID;
      const userName = isCurrentUser ? '您' : msg.userId;
      const actionText = msg.action === 'enter' ? '进入' : '离开';

      addNotification({
        type: 'fence',
        title: `${msg.fenceName} · ${actionText}`,
        message: `${userName}已${actionText}围栏「${msg.fenceName}」`,
        action: msg.action,
      });
    };

    const handleError = (data: unknown) => {
      console.error('WebSocket error:', data);
    };

    on('position:update', handlePositionUpdate);
    on('online:users', handleOnlineUsers);
    on('fence:event', handleFenceEvent);
    on('error', handleError);

    return () => {
      off('position:update', handlePositionUpdate);
      off('online:users', handleOnlineUsers);
      off('fence:event', handleFenceEvent);
      off('error', handleError);
    };
  }, [on, off, addOrUpdateUser, addFenceEvent, addNotification, setCurrentPosition]);

  useEffect(() => {
    connect(CURRENT_USER_ID);
    setConnected(true);

    const reportInterval = window.setInterval(() => {
      if (!subscribedUserId && currentPosition.lat !== 0 && currentPosition.lng !== 0) {
        sendPosition(currentPosition.lat, currentPosition.lng);
      }
    }, 3000);

    return () => {
      clearInterval(reportInterval);
      disconnect();
      setConnected(false);
    };
  }, [connect, disconnect, sendPosition, currentPosition, setConnected, subscribedUserId]);

  useEffect(() => {
    if (subscribedUserId) {
      subscribeUser(subscribedUserId);
    }
  }, [subscribedUserId, subscribeUser]);

  useEffect(() => {
    return () => {
      if (subscribedRef.current) {
        unsubscribeUser(subscribedRef.current);
      }
    };
  }, [unsubscribeUser]);

  return null;
}
