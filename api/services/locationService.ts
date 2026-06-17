import { users } from '../db.js';
import type { UserLocation } from '../../shared/types.js';
import { haversineDistance } from '../../shared/geoUtils.js';

export function updateUserLocation(
  userId: string,
  lat: number,
  lng: number,
  timestamp: number,
  name?: string
): boolean {
  const existingIndex = users.findIndex((u) => u.userId === userId);

  if (existingIndex >= 0) {
    const existing = users[existingIndex];
    users[existingIndex] = {
      ...existing,
      lat,
      lng,
      timestamp,
      online: true,
      name: name || existing.name,
    };
  } else {
    users.push({
      userId,
      name: name || userId,
      lat,
      lng,
      timestamp,
      online: true,
    });
  }

  return true;
}

export function getUserLocation(userId: string): UserLocation | null {
  const user = users.find((u) => u.userId === userId);
  if (!user) return null;
  return { ...user };
}

export function getOnlineUsers(): UserLocation[] {
  return users.filter((u) => u.online).map((u) => ({ ...u }));
}

export function removeUser(userId: string): void {
  const user = users.find((u) => u.userId === userId);
  if (user) {
    user.online = false;
  }
}

export function getNearbyUsers(
  lat: number,
  lng: number,
  radius: number
): UserLocation[] {
  const onlineUsers = getOnlineUsers();
  const nearby: UserLocation[] = [];

  for (const user of onlineUsers) {
    const distance = haversineDistance(lat, lng, user.lat, user.lng);
    if (distance <= radius) {
      nearby.push(user);
    }
  }

  return nearby.sort((a, b) => {
    const distA = haversineDistance(lat, lng, a.lat, a.lng);
    const distB = haversineDistance(lat, lng, b.lat, b.lng);
    return distA - distB;
  });
}
