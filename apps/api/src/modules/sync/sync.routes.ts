import { Router } from 'express';
import { SyncController } from './sync.controller.js';
import { authenticateJWT, requireRole } from '../../middleware/auth.middleware.js';

const router = Router();
const controller = new SyncController();

router.post('/push', authenticateJWT, requireRole(['USER', 'ADMIN']), controller.push);
router.post('/pull', authenticateJWT, requireRole(['USER', 'ADMIN']), controller.pull);
router.get('/status', authenticateJWT, requireRole(['USER', 'ADMIN']), controller.status);

export default router;
