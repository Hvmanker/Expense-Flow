import { Router } from 'express';
import { CaptureController } from './capture.controller.js';

const router = Router();
const controller = new CaptureController();

router.post('/sms', controller.ingestSMS);

export default router;
