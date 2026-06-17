import { Router, type Request, type Response } from 'express';
import { getTrackPoints } from '../services/trackService.js';
import type { TrackPoint } from '../../shared/types.js';

const router = Router();

router.get('/:userId', (req: Request, res: Response): void => {
  try {
    const { userId } = req.params;
    const startTime = req.query.startTime
      ? parseInt(req.query.startTime as string)
      : undefined;
    const endTime = req.query.endTime
      ? parseInt(req.query.endTime as string)
      : undefined;

    const track: TrackPoint[] = getTrackPoints(userId, startTime, endTime);

    res.json({
      success: true,
      data: track,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get track',
    });
  }
});

export default router;
