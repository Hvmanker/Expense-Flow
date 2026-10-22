import { Redis } from 'ioredis';
import { logger } from '@expenseflow/logger';
import { env } from '../config/env.js';

let redisInstance: Redis | null = null;
let isConnected = false;

export function getRedisClient(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true,
      retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
      lazyConnect: true,
    });

    redisInstance.on('connect', () => {
      isConnected = true;
      logger.info('Connected to Redis service');
    });

    redisInstance.on('ready', () => {
      isConnected = true;
    });

    redisInstance.on('error', (err) => {
      isConnected = false;
      logger.warn({ err: err.message }, 'Redis connection warning — caching operating in fallback mode');
    });

    redisInstance.on('close', () => {
      isConnected = false;
    });
  }

  return redisInstance;
}

export function isRedisConnected(): boolean {
  return isConnected;
}

export async function closeRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit().catch(() => redisInstance?.disconnect());
    redisInstance = null;
    isConnected = false;
  }
}
