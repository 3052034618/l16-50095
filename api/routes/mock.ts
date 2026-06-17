import { Router, type Request, type Response } from 'express';
import {
  getAllUsers,
  getAllMerchants,
  getCategories,
} from '../services/mockService.js';
import type { UserLocation, Merchant, Category } from '../../shared/types.js';

const router = Router();

router.get('/users', (req: Request, res: Response): void => {
  try {
    const users: UserLocation[] = getAllUsers();
    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get users',
    });
  }
});

router.get('/merchants', (req: Request, res: Response): void => {
  try {
    const merchants: Merchant[] = getAllMerchants();
    res.json({
      success: true,
      data: merchants,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get merchants',
    });
  }
});

router.get('/categories', (req: Request, res: Response): void => {
  try {
    const categories: Category[] = getCategories();
    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get categories',
    });
  }
});

export default router;
