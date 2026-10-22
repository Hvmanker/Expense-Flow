import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { authenticateJWT } from '../../middleware/auth.middleware.js';

const router = Router();
const controller = new AuthController();

// Magic Link & Email OTP Endpoints
router.post('/magic-link/send', controller.sendMagicLink);
router.post('/magic-link/verify', controller.verifyMagicLink);

// Legacy login endpoint
router.post('/login', controller.login);

// Device token registration (Protected)
router.post('/device-token', authenticateJWT, controller.registerDeviceToken);

export default router;
