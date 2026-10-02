import express, { Request, Response } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { logger } from '@expenseflow/logger';
import captureRoutes from './modules/capture/capture.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import syncRoutes from './modules/sync/sync.routes.js';
import { correlationMiddleware } from './middleware/correlation.middleware.js';
import { idempotencyMiddleware } from './middleware/idempotency.middleware.js';

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expenseflow';

app.use(cors());
app.use(express.json());
app.use(correlationMiddleware);
app.use(idempotencyMiddleware);

// Health Check Endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/capture', captureRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/sync', syncRoutes);

async function bootstrap() {
  try {
    if (process.env.NODE_ENV !== 'test') {
      await mongoose.connect(MONGODB_URI);
      logger.info('Connected to MongoDB database');
      app.listen(PORT, () => {
        logger.info(`ExpenseFlow API server running on port ${PORT}`);
      });
    }
  } catch (err) {
    logger.error({ err }, 'Failed to bootstrap Express API server');
    process.exit(1);
  }
}

bootstrap();

export { app };
