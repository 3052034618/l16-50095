import { users, merchants } from '../db.js';
import { haversineDistance } from '../../shared/geoUtils.js';
import type { NearbyItem, NearbyResult } from '../../shared/types.js';

export function searchNearby(
  lat: number,
  lng: number,
  radius: number,
  category?: string
): NearbyResult {
  const items: NearbyItem[] = [];

  for (const user of users) {
    if (!user.online) continue;
    const distance = haversineDistance(lat, lng, user.lat, user.lng);
    if (distance <= radius) {
      items.push({
        id: user.userId,
        name: user.name,
        type: 'user',
        lat: user.lat,
        lng: user.lng,
        distance,
        online: user.online,
        avatar: user.avatar,
      });
    }
  }

  const filteredMerchants = category
    ? merchants.filter((m) => m.category === category)
    : merchants;

  for (const merchant of filteredMerchants) {
    const distance = haversineDistance(lat, lng, merchant.lat, merchant.lng);
    if (distance <= radius) {
      items.push({
        id: merchant.id,
        name: merchant.name,
        type: 'merchant',
        category: merchant.category,
        lat: merchant.lat,
        lng: merchant.lng,
        distance,
      });
    }
  }

  items.sort((a, b) => a.distance - b.distance);

  return {
    items,
    total: items.length,
  };
}
