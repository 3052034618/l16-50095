export interface UserLocation {
  userId: string;
  name: string;
  lat: number;
  lng: number;
  timestamp: number;
  online: boolean;
  avatar?: string;
}

export interface Merchant {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  address?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export type FenceType = 'circle' | 'polygon';

export interface CircleGeometry {
  center: { lat: number; lng: number };
  radius: number;
}

export interface PolygonGeometry {
  paths: { lat: number; lng: number }[];
}

export type FenceGeometry = CircleGeometry | PolygonGeometry;

export interface Fence {
  id: string;
  name: string;
  type: FenceType;
  color: string;
  enabled: boolean;
  geometry: FenceGeometry;
  createdAt: number;
}

export interface FenceEvent {
  id: number;
  fenceId: string;
  fenceName: string;
  userId: string;
  action: 'enter' | 'leave';
  timestamp: number;
  lat: number;
  lng: number;
}

export interface TrackPoint {
  lat: number;
  lng: number;
  timestamp: number;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
}

export interface NearbyItem {
  id: string;
  name: string;
  type: 'user' | 'merchant';
  category?: string;
  lat: number;
  lng: number;
  distance: number;
  online?: boolean;
  avatar?: string;
}

export interface NearbyResult {
  items: NearbyItem[];
  total: number;
}

export type WSMessageType =
  | 'position:report'
  | 'position:update'
  | 'subscribe:user'
  | 'unsubscribe:user'
  | 'online:users'
  | 'fence:event'
  | 'error';

export interface WSMessage {
  type: WSMessageType;
  [key: string]: unknown;
}

export interface PositionReportMessage extends WSMessage {
  type: 'position:report';
  userId: string;
  lat: number;
  lng: number;
  timestamp: number;
}

export interface PositionUpdateMessage extends WSMessage {
  type: 'position:update';
  userId: string;
  lat: number;
  lng: number;
  timestamp: number;
}

export interface FenceEventMessage extends WSMessage {
  type: 'fence:event';
  fenceId: string;
  fenceName: string;
  userId: string;
  action: 'enter' | 'leave';
  timestamp: number;
  lat: number;
  lng: number;
}

export interface OnlineUsersMessage extends WSMessage {
  type: 'online:users';
  users: { userId: string; lat: number; lng: number; name: string }[];
}
