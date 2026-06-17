import type {
  UserLocation,
  Merchant,
  Category,
  Fence,
  FenceEvent,
  TrackPoint,
  FenceGeometry,
} from '../shared/types.js';
import { generateId } from '../shared/geoUtils.js';

export interface FenceRecord {
  id: string;
  name: string;
  type: 'circle' | 'polygon';
  color: string;
  enabled: number;
  geometry: string;
  created_at: number;
}

export interface UserFenceState {
  user_id: string;
  fence_id: string;
  is_inside: number;
  last_checked: number;
}

const centerLat = 39.9042;
const centerLng = 116.4074;

export const categories: Category[] = [
  { id: 'restaurant', name: '餐厅', icon: 'utensils' },
  { id: 'cafe', name: '咖啡店', icon: 'coffee' },
  { id: 'shop', name: '商店', icon: 'shopping-bag' },
  { id: 'park', name: '公园', icon: 'tree-pine' },
  { id: 'station', name: '车站', icon: 'train' },
  { id: 'hospital', name: '医院', icon: 'hospital' },
];

export const merchants: Merchant[] = [
  { id: 'merchant_1', name: '星巴克咖啡', category: 'cafe', lat: centerLat + 0.002, lng: centerLng + 0.003, address: '王府井大街1号' },
  { id: 'merchant_2', name: '海底捞火锅', category: 'restaurant', lat: centerLat - 0.001, lng: centerLng + 0.005, address: '东单北大街88号' },
  { id: 'merchant_3', name: '便利蜂超市', category: 'shop', lat: centerLat + 0.004, lng: centerLng - 0.002, address: '建国门外大街' },
  { id: 'merchant_4', name: '中山公园', category: 'park', lat: centerLat - 0.003, lng: centerLng - 0.004, address: '天安门西侧' },
  { id: 'merchant_5', name: '北京火车站', category: 'station', lat: centerLat + 0.006, lng: centerLng + 0.008, address: '东城区毛家湾胡同' },
  { id: 'merchant_6', name: '协和医院', category: 'hospital', lat: centerLat + 0.001, lng: centerLng - 0.006, address: '东单帅府园' },
  { id: 'merchant_7', name: '瑞幸咖啡', category: 'cafe', lat: centerLat - 0.005, lng: centerLng + 0.002, address: '崇文门大街' },
  { id: 'merchant_8', name: '全聚德烤鸭', category: 'restaurant', lat: centerLat + 0.003, lng: centerLng - 0.008, address: '前门大街30号' },
  { id: 'merchant_9', name: '万达广场', category: 'shop', lat: centerLat - 0.007, lng: centerLng - 0.005, address: '建国路88号' },
  { id: 'merchant_10', name: '朝阳公园', category: 'park', lat: centerLat + 0.008, lng: centerLng + 0.012, address: '朝阳公园南路' },
  { id: 'merchant_11', name: '西直门地铁站', category: 'station', lat: centerLat + 0.005, lng: centerLng - 0.012, address: '西城区西直门' },
  { id: 'merchant_12', name: '同仁医院', category: 'hospital', lat: centerLat - 0.002, lng: centerLng + 0.007, address: '东城区东交民巷' },
];

export const users: UserLocation[] = [
  { userId: 'user_1', name: '张三', lat: centerLat + 0.001, lng: centerLng + 0.002, timestamp: Date.now(), online: true },
  { userId: 'user_2', name: '李四', lat: centerLat - 0.002, lng: centerLng + 0.004, timestamp: Date.now(), online: true },
  { userId: 'user_3', name: '王五', lat: centerLat + 0.003, lng: centerLng - 0.001, timestamp: Date.now(), online: true },
  { userId: 'user_4', name: '赵六', lat: centerLat - 0.001, lng: centerLng - 0.003, timestamp: Date.now(), online: true },
  { userId: 'user_5', name: '钱七', lat: centerLat + 0.005, lng: centerLng + 0.006, timestamp: Date.now(), online: true },
  { userId: 'user_6', name: '孙八', lat: centerLat - 0.004, lng: centerLng + 0.001, timestamp: Date.now(), online: true },
];

export const fences: FenceRecord[] = [
  {
    id: 'fence_1',
    name: '办公区围栏',
    type: 'circle',
    color: '#0ea5e9',
    enabled: 1,
    geometry: JSON.stringify({
      center: { lat: centerLat, lng: centerLng },
      radius: 800,
    }),
    created_at: Date.now() - 86400000,
  },
  {
    id: 'fence_2',
    name: '商业区围栏',
    type: 'polygon',
    color: '#f59e0b',
    enabled: 1,
    geometry: JSON.stringify({
      paths: [
        { lat: centerLat + 0.005, lng: centerLng - 0.003 },
        { lat: centerLat + 0.006, lng: centerLng + 0.005 },
        { lat: centerLat - 0.002, lng: centerLng + 0.006 },
        { lat: centerLat - 0.003, lng: centerLng - 0.002 },
      ],
    }),
    created_at: Date.now() - 172800000,
  },
];

export const fenceEvents: FenceEvent[] = [];
export const trackPoints: Map<string, TrackPoint[]> = new Map();
export const userFenceStates: Map<string, UserFenceState> = new Map();

export function initDatabase(): void {
  const now = Date.now();

  users.forEach((user) => {
    const points: TrackPoint[] = [];
    for (let i = 0; i < 30; i++) {
      const timestamp = now - (30 - i) * 60000;
      const lat = user.lat + Math.sin(i * 0.4) * 0.0015;
      const lng = user.lng + Math.cos(i * 0.4) * 0.0015;
      points.push({ lat, lng, timestamp });
    }
    trackPoints.set(user.userId, points);
  });

  console.log('Database initialized with mock data');
}

export function fenceRecordToFence(record: FenceRecord): Fence {
  return {
    id: record.id,
    name: record.name,
    type: record.type,
    color: record.color,
    enabled: record.enabled === 1,
    geometry: JSON.parse(record.geometry) as FenceGeometry,
    createdAt: record.created_at,
  };
}

export { generateId };
