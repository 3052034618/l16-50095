import { trackPoints } from '../db.js';
import type { HeatmapPoint, TrackPoint } from '../../shared/types.js';

const GRID_SIZE = 0.001;

export function getHeatmapData(
  startTime?: number,
  endTime?: number
): HeatmapPoint[] {
  const allPoints: TrackPoint[] = [];

  for (const points of trackPoints.values()) {
    for (const point of points) {
      if (startTime !== undefined && point.timestamp < startTime) continue;
      if (endTime !== undefined && point.timestamp > endTime) continue;
      allPoints.push(point);
    }
  }

  return aggregatePoints(allPoints);
}

function aggregatePoints(points: TrackPoint[]): HeatmapPoint[] {
  const gridMap = new Map<string, { lat: number; lng: number; count: number }>();

  for (const point of points) {
    const gridLat = Math.floor(point.lat / GRID_SIZE) * GRID_SIZE;
    const gridLng = Math.floor(point.lng / GRID_SIZE) * GRID_SIZE;
    const key = `${gridLat.toFixed(6)},${gridLng.toFixed(6)}`;

    const existing = gridMap.get(key);
    if (existing) {
      existing.count++;
      existing.lat += (point.lat - existing.lat) / existing.count;
      existing.lng += (point.lng - existing.lng) / existing.count;
    } else {
      gridMap.set(key, {
        lat: point.lat,
        lng: point.lng,
        count: 1,
      });
    }
  }

  const result: HeatmapPoint[] = [];
  for (const cell of gridMap.values()) {
    result.push({
      lat: cell.lat,
      lng: cell.lng,
      weight: cell.count,
    });
  }

  return result.sort((a, b) => b.weight - a.weight);
}
