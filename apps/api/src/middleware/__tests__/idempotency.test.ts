import { describe, it, expect, vi, beforeEach } from 'vitest';
import { idempotencyMiddleware } from '../idempotency.middleware.js';
import { Request, Response } from 'express';

describe('Idempotency Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: ReturnType<typeof vi.fn>;
  let headers: Record<string, string>;

  beforeEach(() => {
    headers = {};
    mockReq = {
      method: 'POST',
      headers: {},
      originalUrl: '/api/v1/transactions',
      body: { amount: 500, currency: 'INR' },
      user: { id: 'user-1', email: 'user@example.com', role: 'USER' },
    };
    mockRes = {
      statusCode: 200,
      setHeader: vi.fn((key: string, value: string) => {
        headers[key] = value;
        return mockRes as Response;
      }),
      status: vi.fn(function (this: any, code: number) {
        this.statusCode = code;
        return this;
      }),
      json: vi.fn(function (this: any, body: any) {
        return body;
      }),
    };
    nextFunction = vi.fn();
  });

  it('should ignore GET requests without caching', async () => {
    mockReq.method = 'GET';
    mockReq.headers = { 'idempotency-key': 'test-key-1' };

    await idempotencyMiddleware(mockReq as Request, mockRes as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should set X-Cache MISS on first POST request and cache response', async () => {
    mockReq.method = 'POST';
    mockReq.headers = { 'idempotency-key': 'test-unique-key-1' };

    await idempotencyMiddleware(mockReq as Request, mockRes as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalled();

    // Simulate route handler calling res.json
    mockRes.json!({ success: true, orderId: 123 });
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Cache', 'MISS');
  });

  it('should return cached response on subsequent request with same idempotency key', async () => {
    const key = 'test-repeat-key-999';

    // First Request
    mockReq.headers = { 'idempotency-key': key };
    await idempotencyMiddleware(mockReq as Request, mockRes as Response, nextFunction);
    mockRes.status!(201).json!({ orderId: 999, status: 'created' });

    // Second Request with same key
    const nextFunction2 = vi.fn();
    const mockRes2: Partial<Response> = {
      statusCode: 200,
      setHeader: vi.fn(),
      status: vi.fn(function (this: any, code: number) {
        this.statusCode = code;
        return this;
      }),
      json: vi.fn(function (this: any, body: any) {
        return body;
      }),
    };

    await idempotencyMiddleware(mockReq as Request, mockRes2 as Response, nextFunction2);

    expect(mockRes2.status).toHaveBeenCalledWith(201);
    expect(mockRes2.json).toHaveBeenCalledWith({ orderId: 999, status: 'created' });
    expect(mockRes2.setHeader).toHaveBeenCalledWith('X-Cache', expect.stringContaining('HIT'));
    expect(nextFunction2).not.toHaveBeenCalled();
  });

  it('should reject reuse of an idempotency key with a different payload', async () => {
    const key = 'payload-mismatch-key';
    mockReq.headers = { 'idempotency-key': key };

    await idempotencyMiddleware(mockReq as Request, mockRes as Response, nextFunction);
    mockRes.status!(201).json!({ transactionId: 'tx-1' });

    const mismatchedRequest = {
      ...mockReq,
      body: { amount: 999, currency: 'INR' },
    } as Request;
    const nextFunction2 = vi.fn();
    const mockRes2: Partial<Response> = {
      statusCode: 200,
      setHeader: vi.fn(),
      status: vi.fn(function (this: any, code: number) {
        this.statusCode = code;
        return this;
      }),
      json: vi.fn(function (this: any, body: any) {
        return body;
      }),
    };

    await idempotencyMiddleware(mismatchedRequest, mockRes2 as Response, nextFunction2);

    expect(mockRes2.status).toHaveBeenCalledWith(409);
    expect(mockRes2.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('different payload') })
    );
    expect(nextFunction2).not.toHaveBeenCalled();
  });

  it('should reject a concurrent request while the first request is in flight', async () => {
    const key = 'concurrent-request-key';
    mockReq.headers = { 'idempotency-key': key };

    await idempotencyMiddleware(mockReq as Request, mockRes as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalledTimes(1);

    const nextFunction2 = vi.fn();
    const mockRes2: Partial<Response> = {
      statusCode: 200,
      setHeader: vi.fn(),
      status: vi.fn(function (this: any, code: number) {
        this.statusCode = code;
        return this;
      }),
      json: vi.fn(function (this: any, body: any) {
        return body;
      }),
    };

    await idempotencyMiddleware(mockReq as Request, mockRes2 as Response, nextFunction2);

    expect(mockRes2.status).toHaveBeenCalledWith(409);
    expect(mockRes2.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('in progress') })
    );
    expect(nextFunction2).not.toHaveBeenCalled();
  });
});
