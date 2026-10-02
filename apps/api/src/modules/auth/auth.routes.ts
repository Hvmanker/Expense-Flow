import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { authenticateJWT } from '../../middleware/auth.middleware.js';

const router = Router();
const controller = new AuthController();

router.post('/login', controller.login);
router.post('/device-token', authenticateJWT, controller.registerDeviceToken);

export default router;
