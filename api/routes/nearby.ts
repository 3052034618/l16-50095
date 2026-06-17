import { Router, type Request, type Response } from 'express';
import { searchNearby } from '../services/nearbyService.js';
import type { NearbyResult } from '../../shared/types.js';

const router = Router();

router.get('/', (req: Request, res: Response): void => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = parseFloat(req.query.radius as string) || 1000;
    const category = req.query.category as string | undefined;

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({
        success: false,
        error: 'Invalid lat or lng parameters',
      });
      return;
    }

    const result: NearbyResult = searchNearby(lat, lng, radius, category);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to search nearby',
    });
  }
});

export default router;
