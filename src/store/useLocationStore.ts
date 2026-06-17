import { create } from 'zustand';
import type {
  UserLocation,
  Fence,
  FenceEvent,
  Merchant,
  Category,
} from '../../shared/types';

interface LocationState {
  onlineUsers: Map<string, UserLocation>;
  currentUserId: string;
  currentPosition: { lat: number; lng: number };
  fences: Fence[];
  fenceEvents: FenceEvent[];
  merchants: Merchant[];
  categories: Category[];
  isConnected: boolean;

  setCurrentUser: (userId: string) => void;
  setCurrentPosition: (lat: number, lng: number) => void;
  addOrUpdateUser: (user: UserLocation) => void;
  removeUser: (userId: string) => void;
  setOnlineUsers: (users: UserLocation[]) => void;
  setFences: (fences: Fence[]) => void;
  addFenceEvent: (event: FenceEvent) => void;
  setConnected: (connected: boolean) => void;
  setMerchants: (merchants: Merchant[]) => void;
  setCategories: (categories: Category[]) => void;
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
    set((state) => ({
      fenceEvents: [event, ...state.fenceEvents].slice(0, 100),
    })),

  setConnected: (connected) => set({ isConnected: connected }),

  setMerchants: (merchants) => set({ merchants }),

  setCategories: (categories) => set({ categories }),
}));
