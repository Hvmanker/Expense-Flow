import { Router } from 'express';
import { AnalyticsController } from './analytics.controller.js';
import { authenticateJWT, requireRole } from '../../middleware/auth.middleware.js';

const router = Router();
const controller = new AnalyticsController();

router.get('/summary', authenticateJWT, requireRole(['USER', 'ADMIN']), controller.getSummary);

export default router;
