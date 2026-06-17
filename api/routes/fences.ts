import { Router, type Request, type Response } from 'express';
import {
  getFences,
  createFence,
  updateFence,
  deleteFence,
  getFenceEvents,
} from '../services/fenceService.js';
import type { Fence, FenceEvent, FenceGeometry } from '../../shared/types.js';

const router = Router();

router.get('/', (req: Request, res: Response): void => {
  try {
    const fences: Fence[] = getFences();
    res.json({
      success: true,
      data: fences,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get fences',
    });
  }
});

router.post('/', (req: Request, res: Response): void => {
  try {
    const { name, type, color, geometry } = req.body as {
      name: string;
      type: 'circle' | 'polygon';
      color: string;
      geometry: FenceGeometry;
    };

    if (!name || !type || !geometry) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
      return;
    }

    const fence: Fence = createFence(name, type, color || '#0ea5e9', geometry);

    res.status(201).json({
      success: true,
      data: fence,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create fence',
    });
  }
});

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { name, type, color, enabled, geometry } = req.body as {
      name: string;
      type: 'circle' | 'polygon';
      color: string;
      enabled: boolean;
      geometry: FenceGeometry;
    };

    if (!name || !type || !geometry) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
      return;
    }

    const fence: Fence | null = updateFence(
      id,
      name,
      type,
      color || '#0ea5e9',
      enabled ?? true,
      geometry
    );

    if (!fence) {
      res.status(404).json({
        success: false,
        error: 'Fence not found',
      });
      return;
    }

    res.json({
      success: true,
      data: fence,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update fence',
    });
  }
});

router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const deleted: boolean = deleteFence(id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Fence not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { message: 'Fence deleted successfully' },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete fence',
    });
  }
});

router.get('/events', (req: Request, res: Response): void => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const events: FenceEvent[] = getFenceEvents(limit);
    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get fence events',
    });
  }
});

export default router;
