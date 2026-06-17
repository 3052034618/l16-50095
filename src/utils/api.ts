import type {
  Fence,
  FenceEvent,
  FenceGeometry,
  NearbyResult,
  TrackPoint,
  HeatmapPoint,
  UserLocation,
  Merchant,
  Category,
} from '../../shared/types';

const BASE_URL = 'http://localhost:3001/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface FenceCreateData {
  name: string;
  type: 'circle' | 'polygon';
  color?: string;
  geometry: FenceGeometry;
}

interface FenceUpdateData {
  name: string;
  type: 'circle' | 'polygon';
  color?: string;
  enabled?: boolean;
  geometry: FenceGeometry;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const result: ApiResponse<T> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Request failed');
  }

  return result.data as T;
}

export function fetchNearby(
  lat: number,
  lng: number,
  radius: number,
  category?: string
): Promise<NearbyResult> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
    radius: radius.toString(),
  });

  if (category) {
    params.append('category', category);
  }

  return request<NearbyResult>(`/nearby?${params.toString()}`);
}

export function fetchFences(): Promise<Fence[]> {
  return request<Fence[]>('/fences');
}

export function createFence(data: FenceCreateData): Promise<Fence> {
  return request<Fence>('/fences', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateFence(id: string, data: FenceUpdateData): Promise<Fence> {
  return request<Fence>(`/fences/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteFence(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/fences/${id}`, {
    method: 'DELETE',
  });
}

export function fetchFenceEvents(limit?: number): Promise<FenceEvent[]> {
  const params = new URLSearchParams();
  if (limit !== undefined) {
    params.append('limit', limit.toString());
  }

  const query = params.toString() ? `?${params.toString()}` : '';
  return request<FenceEvent[]>(`/fences/events${query}`);
}

export function fetchTracks(
  userId: string,
  startTime?: number,
  endTime?: number
): Promise<TrackPoint[]> {
  const params = new URLSearchParams();
  if (startTime !== undefined) {
    params.append('startTime', startTime.toString());
  }
  if (endTime !== undefined) {
    params.append('endTime', endTime.toString());
  }

  const query = params.toString() ? `?${params.toString()}` : '';
  return request<TrackPoint[]>(`/tracks/${userId}${query}`);
}

export function fetchHeatmapData(
  startTime?: number,
  endTime?: number
): Promise<HeatmapPoint[]> {
  const params = new URLSearchParams();
  if (startTime !== undefined) {
    params.append('startTime', startTime.toString());
  }
  if (endTime !== undefined) {
    params.append('endTime', endTime.toString());
  }

  const query = params.toString() ? `?${params.toString()}` : '';
  return request<HeatmapPoint[]>(`/heatmap${query}`);
}

export function fetchUsers(): Promise<UserLocation[]> {
  return request<UserLocation[]>('/mock/users');
}

export function fetchMerchants(): Promise<Merchant[]> {
  return request<Merchant[]>('/mock/merchants');
}

export function fetchCategories(): Promise<Category[]> {
  return request<Category[]>('/mock/categories');
}
