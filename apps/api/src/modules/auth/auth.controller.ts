import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service.js';

const SendMagicLinkSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
});

const VerifyMagicLinkSchema = z.object({
  email: z.string().email(),
  code: z.string().min(1, 'Verification code or token is required'),
});

export class AuthController {
  private service = new AuthService();

  /**
   * Request Email OTP / Magic Link
   * POST /api/v1/auth/magic-link/send
   */
  sendMagicLink = async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = SendMagicLinkSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid email address', details: parsed.error.format() });
        return;
      }

      const result = await this.service.sendMagicLink(parsed.data.email);
      res.json({
        message: 'Verification code sent to your email',
        ...result,
      });
    } catch (err: any) {
      if (err.message === 'OTP_RESEND_TOO_SOON' || err.message === 'OTP_SEND_LIMIT_EXCEEDED') {
        res.status(429).json({ success: false, error: err.message });
        return;
      }
      res.status(500).json({ success: false, error: err.message || 'Failed to dispatch magic link' });
    }
  };

  /**
   * Verify Email OTP / Magic Link and issue session token
   * POST /api/v1/auth/magic-link/verify
   */
  verifyMagicLink = async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = VerifyMagicLinkSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid verification parameters', details: parsed.error.format() });
        return;
      }

      const result = await this.service.verifyMagicLink(parsed.data.email, parsed.data.code);
      res.json({
        success: true,
        message: 'Successfully authenticated',
        ...result,
      });
    } catch (err: any) {
      if (err.message === 'EXPIRED_OR_INVALID_OTP' || err.message === 'INVALID_OTP') {
        res.status(401).json({ success: false, error: 'Verification code is invalid or has expired' });
        return;
      }
      if (err.message === 'TOO_MANY_OTP_ATTEMPTS') {
        res.status(429).json({ success: false, error: 'Too many failed verification attempts; request a new code' });
        return;
      }
      res.status(500).json({ success: false, error: err.message || 'Authentication failed' });
    }
  };

  /**
   * Legacy login for backward compatibility
   * POST /api/v1/auth/login
   */
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ success: false, error: 'Email is required' });
        return;
      }
      // Issue magic link / dev OTP directly
      const result = await this.service.sendMagicLink(email);
      res.json({
        message: 'Please verify code via /api/v1/auth/magic-link/verify',
        ...result,
      });
    } catch (err: any) {
      if (err.message === 'OTP_RESEND_TOO_SOON' || err.message === 'OTP_SEND_LIMIT_EXCEEDED') {
        res.status(429).json({ success: false, error: err.message });
        return;
      }
      res.status(500).json({ success: false, error: err.message || 'Internal server error' });
    }
  };

  /**
   * Register Device Token for Apple Shortcuts
   * POST /api/v1/auth/device-token
   */
  registerDeviceToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { deviceToken, deviceName } = req.body;
      if (!userId || !deviceToken) {
        res.status(400).json({ success: false, error: 'Missing deviceToken or unauthenticated user session' });
        return;
      }

      const record = await this.service.registerDeviceToken(userId, deviceToken, deviceName || 'iPhone');
      res.json({ success: true, deviceToken: record.deviceToken });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Internal server error' });
    }
  };
}
