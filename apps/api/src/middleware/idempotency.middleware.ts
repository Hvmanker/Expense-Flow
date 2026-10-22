import { Request, Response, NextFunction } from 'express';
import { createHash, randomUUID } from 'crypto';
import { getRedisClient, isRedisConnected } from '../redis/client.js';
import { logger } from '@expenseflow/logger';

interface CachedResponse {
  status: number;
  body: any;
  requestHash: string;
}

// Bounded in-memory fallback if Redis is temporarily unreachable
const memoryFallback = new Map<string, { data: CachedResponse; expiresAt: number }>();
const memoryLocks = new Map<string, { ownerToken: string; expiresAt: number }>();
const MAX_FALLBACK_ENTRIES = 500;
const TTL_SECONDS = 86400; // 24 hours
const LOCK_TTL_SECONDS = 30;
const RELEASE_LOCK_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function hashRequestBody(body: unknown): string {
  return createHash('sha256').update(canonicalJson(body ?? null)).digest('hex');
}

function pruneMemoryFallback() {
  const now = Date.now();
  for (const [key, val] of memoryFallback.entries()) {
    if (val.expiresAt < now) {
      memoryFallback.delete(key);
    }
  }
  for (const [key, lock] of memoryLocks.entries()) {
    if (lock.expiresAt < now) memoryLocks.delete(key);
  }
  if (memoryFallback.size > MAX_FALLBACK_ENTRIES) {
    const oldestKey = memoryFallback.keys().next().value;
    if (oldestKey) memoryFallback.delete(oldestKey);
  }
}

export async function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!['POST', 'PATCH', 'PUT'].includes(req.method)) {
    next();
    return;
  }

  const idempotencyKey = (req.headers['idempotency-key'] || req.headers['x-idempotency-key']) as string;
  if (!idempotencyKey) {
    next();
    return;
  }

  const userId = req.user?.id || 'anonymous';
  const path = req.originalUrl || req.url || 'default';
  const cacheKey = `idempotency:${userId}:${req.method}:${path}:${idempotencyKey}`;
  const lockKey = `${cacheKey}:lock`;
  const lockOwnerToken = randomUUID();
  const requestHash = hashRequestBody(req.body);
  let redis = isRedisConnected() ? getRedisClient() : null;

  const rejectConflict = (message: string) => {
    res.setHeader('X-Idempotency-Key', idempotencyKey);
    res.status(409).json({ success: false, error: message });
  };

  // 1. Check the completed response cache and acquire an in-flight lock.
  try {
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed: CachedResponse = JSON.parse(cached);
        if (parsed.requestHash !== requestHash) {
          rejectConflict('Idempotency key was already used with a different payload');
          return;
        }
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Idempotency-Key', idempotencyKey);
        res.status(parsed.status).json(parsed.body);
        return;
      }

      const acquired = await redis.set(
        lockKey,
        lockOwnerToken,
        'EX',
        LOCK_TTL_SECONDS,
        'NX'
      );
      if (acquired !== 'OK') {
        rejectConflict('A request with this idempotency key is already in progress');
        return;
      }
    } else {
      pruneMemoryFallback();
      const memEntry = memoryFallback.get(cacheKey);
      if (memEntry && memEntry.expiresAt > Date.now()) {
        if (memEntry.data.requestHash !== requestHash) {
          rejectConflict('Idempotency key was already used with a different payload');
          return;
        }
        res.setHeader('X-Cache', 'HIT-MEMORY');
        res.setHeader('X-Idempotency-Key', idempotencyKey);
        res.status(memEntry.data.status).json(memEntry.data.body);
        return;
      }

      if ((memoryLocks.get(lockKey)?.expiresAt ?? 0) > Date.now()) {
        rejectConflict('A request with this idempotency key is already in progress');
        return;
      }
      memoryLocks.set(lockKey, {
        ownerToken: lockOwnerToken,
        expiresAt: Date.now() + LOCK_TTL_SECONDS * 1000,
      });
    }
  } catch (err: any) {
    logger.warn(
      { err: err.message, key: idempotencyKey },
      'Redis idempotency unavailable; using bounded in-memory protection'
    );
    redis = null;
    pruneMemoryFallback();
    if ((memoryLocks.get(lockKey)?.expiresAt ?? 0) > Date.now()) {
      rejectConflict('A request with this idempotency key is already in progress');
      return;
    }
    memoryLocks.set(lockKey, {
      ownerToken: lockOwnerToken,
      expiresAt: Date.now() + LOCK_TTL_SECONDS * 1000,
    });
  }

  // 2. Intercept response to store result
  const originalJson = res.json.bind(res);
  let released = false;
  const releaseLock = () => {
    if (released) return;
    released = true;
    if (redis) {
      redis.eval(RELEASE_LOCK_SCRIPT, 1, lockKey, lockOwnerToken).catch((err) =>
        logger.warn({ err: err.message }, 'Failed to release Redis idempotency lock')
      );
    } else {
      if (memoryLocks.get(lockKey)?.ownerToken === lockOwnerToken) {
        memoryLocks.delete(lockKey);
      }
    }
  };

  res.json = function (body: any): Response {
    // Cache only successful responses. Client errors remain retryable after correction.
    if (res.statusCode >= 200 && res.statusCode < 400) {
      const payload: CachedResponse = {
        status: res.statusCode,
        body,
        requestHash,
      };

      if (redis) {
        redis
          .set(cacheKey, JSON.stringify(payload), 'EX', TTL_SECONDS)
          .catch((err) =>
            logger.warn({ err: err.message }, 'Failed to set idempotency cache in Redis')
          )
          .finally(releaseLock);
      } else {
        pruneMemoryFallback();
        memoryFallback.set(cacheKey, {
          data: payload,
          expiresAt: Date.now() + TTL_SECONDS * 1000,
        });
        releaseLock();
      }
    } else {
      releaseLock();
    }

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('X-Idempotency-Key', idempotencyKey);
    return originalJson(body);
  };

  try {
    next();
  } catch (error) {
    releaseLock();
    throw error;
  }
}
