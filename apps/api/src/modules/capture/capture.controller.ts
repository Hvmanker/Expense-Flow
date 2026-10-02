import { Request, Response } from 'express';
import { SMSIngestionPayloadSchema } from '@expenseflow/shared-types';
import { CaptureService } from './capture.service.js';

export class CaptureController {
  private service = new CaptureService();

  ingestSMS = async (req: Request, res: Response): Promise<void> => {
    try {
      const deviceToken = req.headers['x-device-token'] as string;
      if (!deviceToken) {
        res.status(401).json({ success: false, error: 'Missing X-Device-Token header' });
        return;
      }

      const parseResult = SMSIngestionPayloadSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({ success: false, error: 'Invalid payload format', details: parseResult.error.format() });
        return;
      }

      const result = await this.service.processSMSCapture(deviceToken, parseResult.data);
      res.status(result.isDuplicate ? 200 : 201).json({
        success: true,
        isDuplicate: result.isDuplicate,
        transaction: result.transaction,
      });
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED_DEVICE_TOKEN') {
        res.status(401).json({ success: false, error: 'Invalid device token' });
        return;
      }
      if (err.message === 'FAILED_TO_PARSE_SMS') {
        res.status(422).json({ success: false, error: 'Could not extract financial details from SMS' });
        return;
      }
      res.status(500).json({ success: false, error: err.message || 'Internal server error' });
    }
  };
}
