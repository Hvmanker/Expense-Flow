import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../auth.service.js';
import { UserModel } from '@expenseflow/database';
import * as redisClient from '../../../redis/client.js';

describe('AuthService - Magic Link & OTP Flow', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    vi.restoreAllMocks();
  });

  it('should generate a 6-digit OTP when sending magic link in development', async () => {
    const testEmail = 'developer@expenseflow.ai';
    const result = await authService.sendMagicLink(testEmail);

    expect(result.success).toBe(true);
    expect(result.devOtp).toBeDefined();
    expect(result.devOtp).toHaveLength(6);
    expect(/^\d+$/.test(result.devOtp!)).toBe(true);
  });

  it('should reject verification with invalid OTP', async () => {
    const testEmail = 'invalid-test@expenseflow.ai';
    await authService.sendMagicLink(testEmail);

    await expect(authService.verifyMagicLink(testEmail, '999999')).rejects.toThrow(
      'INVALID_OTP'
    );
  });

  it('should throttle immediate OTP resend attempts', async () => {
    const testEmail = 'resend-limit@expenseflow.ai';
    await authService.sendMagicLink(testEmail);

    await expect(authService.sendMagicLink(testEmail)).rejects.toThrow(
      'OTP_RESEND_TOO_SOON'
    );
  });

  it('should invalidate an OTP after five failed verification attempts', async () => {
    const testEmail = 'attempt-limit@expenseflow.ai';
    const sendResult = await authService.sendMagicLink(testEmail);

    for (let attempt = 1; attempt < 5; attempt += 1) {
      await expect(authService.verifyMagicLink(testEmail, '000000')).rejects.toThrow(
        'INVALID_OTP'
      );
    }
    await expect(authService.verifyMagicLink(testEmail, '000000')).rejects.toThrow(
      'TOO_MANY_OTP_ATTEMPTS'
    );
    await expect(authService.verifyMagicLink(testEmail, sendResult.devOtp!)).rejects.toThrow(
      'EXPIRED_OR_INVALID_OTP'
    );
  });

  it('should successfully verify valid OTP, consume it, and issue JWT session', async () => {
    const testEmail = 'valid-user@expenseflow.ai';
    const sendResult = await authService.sendMagicLink(testEmail);
    const validOtp = sendResult.devOtp!;

    // Mock UserModel to return a mock user
    vi.spyOn(UserModel, 'findOne').mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      email: testEmail,
      name: 'valid-user',
      currency: 'INR',
    } as any);

    const verifyResult = await authService.verifyMagicLink(testEmail, validOtp);

    expect(verifyResult.token).toBeDefined();
    expect(typeof verifyResult.token).toBe('string');
    expect(verifyResult.user.email).toBe(testEmail);

    // Assert single-use: subsequent verification with same OTP must fail
    await expect(authService.verifyMagicLink(testEmail, validOtp)).rejects.toThrow(
      'EXPIRED_OR_INVALID_OTP'
    );
  });

  it('should atomically validate and consume a Redis-backed OTP', async () => {
    const testEmail = 'redis-user@expenseflow.ai';
    const validOtp = '123456';
    const stored = JSON.stringify({
      otp: validOtp,
      token: 'secure-magic-token',
      expiresAt: Date.now() + 60_000,
    });
    const evalMock = vi.fn().mockResolvedValue(stored);

    vi.spyOn(redisClient, 'isRedisConnected').mockReturnValue(true);
    vi.spyOn(redisClient, 'getRedisClient').mockReturnValue({ eval: evalMock } as any);
    vi.spyOn(UserModel, 'findOne').mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      email: testEmail,
      name: 'redis-user',
      currency: 'INR',
    } as any);

    const result = await authService.verifyMagicLink(testEmail, validOtp);

    expect(result.user.email).toBe(testEmail);
    expect(evalMock).toHaveBeenCalledTimes(1);
    expect(evalMock.mock.calls[0][1]).toBe(2);
    expect(evalMock.mock.calls[0][2]).toBe(`auth:otp:${testEmail}`);
    expect(evalMock.mock.calls[0][3]).toBe(`auth:otp:attempts:${testEmail}`);
    expect(evalMock.mock.calls[0][4]).toBe(validOtp);
  });
});
