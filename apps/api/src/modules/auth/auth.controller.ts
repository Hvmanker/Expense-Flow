import { Request, Response } from 'express';
import { AuthService } from './auth.service.js';

export class AuthController {
  private service = new AuthService();

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, name } = req.body;
      if (!email) {
        res.status(400).json({ success: false, error: 'Email is required' });
        return;
      }

      const result = await this.service.registerOrLogin(email, name || 'ExpenseFlow User');
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Internal server error' });
    }
  };

  registerDeviceToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { deviceToken, deviceName } = req.body;
      if (!userId || !deviceToken) {
        res.status(400).json({ success: false, error: 'Missing deviceToken or unauthenticated user' });
        return;
      }

      const record = await this.service.registerDeviceToken(userId, deviceToken, deviceName || 'iPhone');
      res.json({ success: true, deviceToken: record.deviceToken });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Internal server error' });
    }
  };
}
