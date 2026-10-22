import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExpenseFlowSDK } from '../client.js';

describe('ExpenseFlowSDK Unit Tests', () => {
  const baseUrl = 'http://localhost:4000';
  let sdk: ExpenseFlowSDK;

  beforeEach(() => {
    vi.restoreAllMocks();
    sdk = new ExpenseFlowSDK({ baseUrl });
  });

  it('should initialize with default config and allow setting authToken', () => {
    sdk.setAuthToken('test-jwt-token-xyz');
    // @ts-ignore
    const headers = sdk.getHeaders();
    expect(headers['Authorization']).toBe('Bearer test-jwt-token-xyz');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('should include X-Device-Token header when deviceToken is configured', () => {
    const deviceSdk = new ExpenseFlowSDK({
      baseUrl,
      deviceToken: 'device-uuid-999',
    });
    // @ts-ignore
    const headers = deviceSdk.getHeaders();
    expect(headers['X-Device-Token']).toBe('device-uuid-999');
    expect(headers['Authorization']).toBeUndefined();
  });

  it('should send magic link request to auth API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: 'OTP sent' }),
    });
    globalThis.fetch = mockFetch;

    const res = await sdk.sendMagicLink('user@expenseflow.ai');
    expect(res.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      `${baseUrl}/api/v1/auth/magic-link/send`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'user@expenseflow.ai' }),
      })
    );
  });

  it('should verify magic link OTP and return JWT token', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        token: 'signed-jwt-token',
        user: { id: 'usr-1', email: 'user@expenseflow.ai' },
      }),
    });
    globalThis.fetch = mockFetch;

    const res = await sdk.verifyMagicLink('user@expenseflow.ai', '123456');
    expect(res.token).toBe('signed-jwt-token');
    expect(mockFetch).toHaveBeenCalledWith(
      `${baseUrl}/api/v1/auth/magic-link/verify`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'user@expenseflow.ai', code: '123456' }),
      })
    );
  });

  it('should dispatch pushSync with offline changes and auth header', async () => {
    sdk.setAuthToken('jwt-session-token');
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ syncedIds: ['tx-1', 'tx-2'], conflicts: [] }),
    });
    globalThis.fetch = mockFetch;

    const changes = [
      {
        queueId: 'q-1',
        entityType: 'TRANSACTION' as const,
        operation: 'UPDATE' as const,
        entityId: 'tx-1',
        payload: { status: 'CONFIRMED' },
        clientTimestamp: new Date().toISOString(),
      },
    ];

    const res = await sdk.pushSync(changes);
    expect(res.syncedIds).toEqual(['tx-1', 'tx-2']);
    expect(mockFetch).toHaveBeenCalledWith(
      `${baseUrl}/api/v1/sync/push`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer jwt-session-token',
        }),
      })
    );
  });

  it('should dispatch pullSync with timestamp and parse server response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        transactions: [{ id: 'tx-100', amount: 500, merchant: 'UBER' }],
        timestamp: '2026-10-22T05:00:00.000Z',
      }),
    });
    globalThis.fetch = mockFetch;

    const res = await sdk.pullSync('2026-10-21T00:00:00.000Z');
    expect(res.transactions.length).toBe(1);
    expect(res.timestamp).toBe('2026-10-22T05:00:00.000Z');
  });

  it('should post SMS ingestion payload in captureSMS', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        transaction: { id: 'tx-200', amount: 350 },
        isDuplicate: false,
      }),
    });
    globalThis.fetch = mockFetch;

    const res = await sdk.captureSMS({
      rawText: 'Sent Rs. 350 to Starbucks',
      sender: 'HDFCBK',
      source: 'APPLE_SHORTCUTS',
    });
    expect(res.isDuplicate).toBe(false);
    expect(res.transaction.amount).toBe(350);
  });
});
