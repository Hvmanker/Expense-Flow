import { Request, Response } from 'express';
import { SyncService } from './sync.service.js';

export class SyncController {
  private service = new SyncService();

  push = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized user session' });
        return;
      }

      const { changes } = req.body;
      if (!Array.isArray(changes)) {
        res.status(400).json({ success: false, error: 'Invalid changes array' });
        return;
      }

      const result = await this.service.processPushChanges(userId, changes);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Internal server error' });
    }
  };

  pull = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized user session' });
        return;
      }

      const { lastSyncTimestamp } = req.body;
      const result = await this.service.getPullDeltas(userId, lastSyncTimestamp);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Internal server error' });
    }
  };

  status = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized user session' });
        return;
      }

      const result = await this.service.getSyncStatus(userId);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Internal server error' });
    }
  };
}
