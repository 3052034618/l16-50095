import { create } from 'zustand';
import type {
  UserLocation,
  Fence,
  FenceEvent,
  Merchant,
  Category,
} from '../../shared/types';

interface Notification {
  id: string;
  type: 'fence' | 'info';
  title: string;
  message: string;
  timestamp: number;
  action?: 'enter' | 'leave';
}

interface LocationState {
  onlineUsers: Map<string, UserLocation>;
  currentUserId: string;
  currentPosition: { lat: number; lng: number };
  fences: Fence[];
  fenceEvents: FenceEvent[];
  merchants: Merchant[];
  categories: Category[];
  isConnected: boolean;
  subscribedUserId: string | null;
  notifications: Notification[];
  fenceEventsLoaded: boolean;

  setCurrentUser: (userId: string) => void;
  setCurrentPosition: (lat: number, lng: number) => void;
  addOrUpdateUser: (user: UserLocation) => void;
  removeUser: (userId: string) => void;
  setOnlineUsers: (users: UserLocation[]) => void;
  setFences: (fences: Fence[]) => void;
  addFenceEvent: (event: FenceEvent) => void;
  setFenceEvents: (events: FenceEvent[]) => void;
  setConnected: (connected: boolean) => void;
  setMerchants: (merchants: Merchant[]) => void;
  setCategories: (categories: Category[]) => void;
  setSubscribedUser: (userId: string | null) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  onlineUsers: new Map(),
  currentUserId: '',
  currentPosition: { lat: 0, lng: 0 },
  fences: [],
  fenceEvents: [],
  merchants: [],
  categories: [],
  isConnected: false,
  subscribedUserId: null,
  notifications: [],
  fenceEventsLoaded: false,

  setCurrentUser: (userId) => set({ currentUserId: userId }),

  setCurrentPosition: (lat, lng) => set({ currentPosition: { lat, lng } }),

  addOrUpdateUser: (user) =>
    set((state) => {
      const newOnlineUsers = new Map(state.onlineUsers);
      newOnlineUsers.set(user.userId, user);
      return { onlineUsers: newOnlineUsers };
    }),

  removeUser: (userId) =>
    set((state) => {
      const newOnlineUsers = new Map(state.onlineUsers);
      newOnlineUsers.delete(userId);
      return { onlineUsers: newOnlineUsers };
    }),

  setOnlineUsers: (users) =>
    set(() => {
      const newOnlineUsers = new Map<string, UserLocation>();
      users.forEach((user) => {
        newOnlineUsers.set(user.userId, user);
      });
      return { onlineUsers: newOnlineUsers };
    }),

  setFences: (fences) => set({ fences }),

  addFenceEvent: (event) =>
    set((state) => {
      const exists = state.fenceEvents.some(
        (e) =>
          e.fenceId === event.fenceId &&
          e.userId === event.userId &&
          e.action === event.action &&
          Math.abs(e.timestamp - event.timestamp) < 1000
      );
      if (exists) return state;
      return {
        fenceEvents: [event, ...state.fenceEvents].slice(0, 50),
      };
    }),

  setFenceEvents: (events) =>
    set({ fenceEvents: events.slice(0, 50), fenceEventsLoaded: true }),

  setConnected: (connected) => set({ isConnected: connected }),

  setMerchants: (merchants) => set({ merchants }),

  setCategories: (categories) => set({ categories }),

  setSubscribedUser: (userId) => set({ subscribedUserId: userId }),

  addNotification: (notification) =>
    set((state) => {
      const id = `${notification.type}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const newNotification = {
        ...notification,
        id,
        timestamp: Date.now(),
      };
      return {
        notifications: [newNotification, ...state.notifications].slice(0, 10),
      };
    }),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearNotifications: () => set({ notifications: [] }),
}));
