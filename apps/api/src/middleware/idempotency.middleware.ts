import { Request, Response, NextFunction } from 'express';

const idempotencyCache = new Map<string, { status: number; body: any }>();

export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
    const idempotencyKey = req.headers['idempotency-key'] as string;
    if (idempotencyKey && idempotencyCache.has(idempotencyKey)) {
      const cached = idempotencyCache.get(idempotencyKey)!;
      res.status(cached.status).json(cached.body);
      return;
    }
  }
  next();
}
