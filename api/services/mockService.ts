import { users, merchants, categories } from '../db.js';
import type { UserLocation, Merchant, Category } from '../../shared/types.js';

export function getAllUsers(): UserLocation[] {
  return [...users];
}

export function getAllMerchants(): Merchant[] {
  return [...merchants];
}

export function getCategories(): Category[] {
  return [...categories];
}
