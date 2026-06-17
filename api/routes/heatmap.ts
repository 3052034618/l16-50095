import { Router, type Request, type Response } from 'express';
import { getHeatmapData } from '../services/heatmapService.js';
import type { HeatmapPoint } from '../../shared/types.js';

const router = Router();

router.get('/', (req: Request, res: Response): void => {
  try {
    const startTime = req.query.startTime
      ? parseInt(req.query.startTime as string)
      : undefined;
    const endTime = req.query.endTime
      ? parseInt(req.query.endTime as string)
      : undefined;

    const data: HeatmapPoint[] = getHeatmapData(startTime, endTime);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get heatmap data',
    });
  }
});

export default router;
