import {
  fences,
  fenceEvents,
  userFenceStates,
  fenceRecordToFence,
  generateId,
} from '../db.js';
import type { Fence, FenceEvent, FenceGeometry } from '../../shared/types.js';
import { isPointInCircle, isPointInPolygon } from '../../shared/geoUtils.js';

export function getFences(): Fence[] {
  return [...fences]
    .sort((a, b) => b.created_at - a.created_at)
    .map(fenceRecordToFence);
}

export function getFence(id: string): Fence | null {
  const record = fences.find((f) => f.id === id);
  if (!record) return null;
  return fenceRecordToFence(record);
}

export function createFence(
  name: string,
  type: 'circle' | 'polygon',
  color: string,
  geometry: FenceGeometry
): Fence {
  const id = generateId();
  const now = Date.now();

  const record = {
    id,
    name,
    type,
    color,
    enabled: 1,
    geometry: JSON.stringify(geometry),
    created_at: now,
  };

  fences.push(record);

  return {
    id,
    name,
    type,
    color,
    enabled: true,
    geometry,
    createdAt: now,
  };
}

export function updateFence(
  id: string,
  name: string,
  type: 'circle' | 'polygon',
  color: string,
  enabled: boolean,
  geometry: FenceGeometry
): Fence | null {
  const index = fences.findIndex((f) => f.id === id);
  if (index < 0) return null;

  fences[index] = {
    ...fences[index],
    name,
    type,
    color,
    enabled: enabled ? 1 : 0,
    geometry: JSON.stringify(geometry),
  };

  return getFence(id);
}

export function deleteFence(id: string): boolean {
  const index = fences.findIndex((f) => f.id === id);
  if (index < 0) return false;
  fences.splice(index, 1);
  return true;
}

export function checkFenceEvents(
  userId: string,
  lat: number,
  lng: number,
  timestamp: number
): FenceEvent[] {
  const enabledFences = getFences().filter((f) => f.enabled);
  const events: FenceEvent[] = [];

  for (const fence of enabledFences) {
    let isInside = false;

    if (fence.type === 'circle') {
      const geometry = fence.geometry as {
        center: { lat: number; lng: number };
        radius: number;
      };
      isInside = isPointInCircle(
        lat,
        lng,
        geometry.center.lat,
        geometry.center.lng,
        geometry.radius
      );
    } else if (fence.type === 'polygon') {
      const geometry = fence.geometry as {
        paths: { lat: number; lng: number }[];
      };
      isInside = isPointInPolygon(lat, lng, geometry.paths);
    }

    const stateKey = `${userId}_${fence.id}`;
    const state = userFenceStates.get(stateKey);
    const wasInside = state ? state.is_inside === 1 : false;

    let action: 'enter' | 'leave' | null = null;
    if (isInside && !wasInside) {
      action = 'enter';
    } else if (!isInside && wasInside) {
      action = 'leave';
    }

    if (action) {
      const eventId = fenceEvents.length + 1;
      const event: FenceEvent = {
        id: eventId,
        fenceId: fence.id,
        fenceName: fence.name,
        userId,
        action,
        timestamp,
        lat,
        lng,
      };
      fenceEvents.push(event);
      events.push(event);
    }

    userFenceStates.set(stateKey, {
      user_id: userId,
      fence_id: fence.id,
      is_inside: isInside ? 1 : 0,
      last_checked: timestamp,
    });
  }

  return events;
}

export function getFenceEvents(limit: number = 100): FenceEvent[] {
  return [...fenceEvents]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}
