import { Request, Response } from 'express';
import { AnalyticsService } from './analytics.service.js';

export class AnalyticsController {
  private service = new AnalyticsService();

  getSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized user session' });
        return;
      }

      const summary = await this.service.getSummary(userId);
      res.json({ success: true, data: summary });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Internal server error' });
    }
  };
}
