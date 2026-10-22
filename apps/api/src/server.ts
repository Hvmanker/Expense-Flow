import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { logger } from '@expenseflow/logger';
import { env } from './config/env.js';
import { getRedisClient, closeRedis, isRedisConnected } from './redis/client.js';
import { startCategorizationWorker, closeCategorizationWorker } from './workers/categorization.worker.js';
import { closeTransactionQueue } from './queues/transaction.queue.js';
import captureRoutes from './modules/capture/capture.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import syncRoutes from './modules/sync/sync.routes.js';
import { correlationMiddleware } from './middleware/correlation.middleware.js';
import { idempotencyMiddleware } from './middleware/idempotency.middleware.js';

const app = express();

// Security and Essential Middleware
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(correlationMiddleware);
app.use(idempotencyMiddleware);

// Enhanced Health Check & Readiness Probes
app.get('/health', async (_req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'UP' : 'DOWN';
  const redisStatus = isRedisConnected() ? 'UP' : 'DEGRADED';
  const isHealthy = mongoStatus === 'UP';

  const healthData = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    dependencies: {
      mongodb: {
        status: mongoStatus,
      },
      redis: {
        status: redisStatus,
      },
    },
    memory: {
      rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
  };

  res.status(isHealthy ? 200 : 503).json(healthData);
});

// API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/capture', captureRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/sync', syncRoutes);

// Centralized 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

let server: ReturnType<typeof app.listen> | null = null;

async function bootstrap() {
  try {
    if (env.NODE_ENV !== 'test') {
      // 1. Connect to MongoDB with Connection Pooling
      await mongoose.connect(env.MONGODB_URI, {
        maxPoolSize: 50,
        minPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      logger.info('Connected to MongoDB database with connection pool [10-50]');

      // 2. Initialize Redis Client
      try {
        await getRedisClient().connect();
      } catch (redisErr: any) {
        logger.warn({ err: redisErr.message }, 'Redis initial connection delayed — operating in fallback mode');
      }

      // 3. Start BullMQ Categorization Worker
      try {
        startCategorizationWorker();
      } catch (workerErr: any) {
        logger.warn({ err: workerErr.message }, 'Failed to start BullMQ worker');
      }

      // 4. Start HTTP Server
      server = app.listen(env.PORT, () => {
        logger.info(`ExpenseFlow API server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      });
    }
  } catch (err) {
    logger.error({ err }, 'Failed to bootstrap Express API server');
    process.exit(1);
  }
}

// Graceful Shutdown Handlers
async function gracefulShutdown(signal: string) {
  logger.info({ signal }, 'Received shutdown signal, terminating gracefully...');

  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }

  try {
    await closeCategorizationWorker();
    await closeTransactionQueue();
    logger.info('BullMQ workers and queues closed');
    await closeRedis();
    logger.info('Redis connection closed');
    await mongoose.disconnect();
    logger.info('MongoDB connection closed');
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error closing backing services during shutdown');
  }

  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

bootstrap();

export { app };
