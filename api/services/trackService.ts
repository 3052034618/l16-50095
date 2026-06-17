import { trackPoints } from '../db.js';
import type { TrackPoint } from '../../shared/types.js';

const TRACK_RETENTION_DAYS = 30;

export function addTrackPoint(
  userId: string,
  lat: number,
  lng: number,
  timestamp: number
): void {
  const points = trackPoints.get(userId) || [];
  points.push({ lat, lng, timestamp });
  trackPoints.set(userId, points);
}

export function getUserTrack(
  userId: string,
  startTime?: number,
  endTime?: number
): TrackPoint[] {
  return getTrackPoints(userId, startTime, endTime);
}

export function getTrackPoints(
  userId: string,
  startTime?: number,
  endTime?: number
): TrackPoint[] {
  const points = trackPoints.get(userId) || [];
  let filtered = [...points];

  if (startTime !== undefined) {
    filtered = filtered.filter((p) => p.timestamp >= startTime);
  }
  if (endTime !== undefined) {
    filtered = filtered.filter((p) => p.timestamp <= endTime);
  }

  return filtered.sort((a, b) => a.timestamp - b.timestamp);
}

export function clearOldTracks(): number {
  const cutoffTime = Date.now() - TRACK_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let deletedCount = 0;

  for (const [userId, points] of trackPoints) {
    const newPoints = points.filter((p) => p.timestamp >= cutoffTime);
    deletedCount += points.length - newPoints.length;
    if (newPoints.length > 0) {
      trackPoints.set(userId, newPoints);
    } else {
      trackPoints.delete(userId);
    }
  }

  return deletedCount;
}
