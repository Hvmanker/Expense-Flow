import jwt from 'jsonwebtoken';
import { randomBytes, randomInt } from 'crypto';
import { UserModel, DeviceTokenModel } from '@expenseflow/database';
import { env } from '../../config/env.js';
import { getRedisClient, isRedisConnected } from '../../redis/client.js';
import { sendOtpEmail } from './mailer.js';
import { logger } from '@expenseflow/logger';

interface StoredOtpData {
  otp: string;
  token: string;
  expiresAt: number;
}

// In-memory fallback if Redis is not connected during local dev/tests
const memoryOtpStore = new Map<string, StoredOtpData>();
const OTP_TTL_SECONDS = 600; // 10 minutes
const CONSUME_OTP_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then
  return nil
end
local data = cjson.decode(raw)
if data.otp ~= ARGV[1] and data.token ~= ARGV[1] then
  return ''
end
redis.call('DEL', KEYS[1])
return raw
`;

export class AuthService {
  /**
   * Generates single-use 6-digit OTP and secure magic link token, saves to Redis, and sends email.
   */
  async sendMagicLink(email: string): Promise<{ success: boolean; devOtp?: string }> {
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Generate cryptographically secure 6-digit numeric OTP and 24-byte secure token
    const otp = randomInt(100000, 1000000).toString();
    const token = randomBytes(24).toString('hex');
    const expiresAt = Date.now() + OTP_TTL_SECONDS * 1000;

    const data: StoredOtpData = { otp, token, expiresAt };
    const cacheKey = `auth:otp:${normalizedEmail}`;

    // 2. Save in Redis (with 10-minute expiry) or in-memory fallback
    if (isRedisConnected()) {
      await getRedisClient().set(cacheKey, JSON.stringify(data), 'EX', OTP_TTL_SECONDS);
    } else {
      memoryOtpStore.set(normalizedEmail, data);
    }

    // 3. Construct Magic Link URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const magicLinkUrl = `${baseUrl}/auth/verify?email=${encodeURIComponent(normalizedEmail)}&token=${token}`;

    // 4. Send Email via Mailer
    await sendOtpEmail({
      email: normalizedEmail,
      otp,
      magicLinkUrl,
    });

    logger.info({ email: normalizedEmail }, 'Dispatched authentication OTP / Magic Link');

    return {
      success: true,
      // Provide devOtp when not running in production for automated test harnesses
      devOtp: env.NODE_ENV !== 'production' ? otp : undefined,
    };
  }

  /**
   * Validates single-use OTP or magic token, creates or finds user, and issues signed JWT.
   */
  async verifyMagicLink(email: string, codeOrToken: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const cacheKey = `auth:otp:${normalizedEmail}`;
    let stored: StoredOtpData | null = null;

    // 1. Atomically validate and consume Redis-backed credentials. The in-memory
    // fallback is synchronous until deletion, so it preserves the same single-use
    // behavior within this process.
    if (isRedisConnected()) {
      const raw = await getRedisClient().eval(
        CONSUME_OTP_SCRIPT,
        1,
        cacheKey,
        codeOrToken
      );
      if (raw === null) throw new Error('EXPIRED_OR_INVALID_OTP');
      if (raw === '') throw new Error('INVALID_OTP');
      stored = JSON.parse(String(raw));
    } else {
      const mem = memoryOtpStore.get(normalizedEmail);
      if (mem && mem.expiresAt > Date.now()) {
        const isMatch = mem.otp === codeOrToken || mem.token === codeOrToken;
        if (!isMatch) throw new Error('INVALID_OTP');
        memoryOtpStore.delete(normalizedEmail);
        stored = mem;
      } else if (mem) {
        memoryOtpStore.delete(normalizedEmail);
      }
    }

    if (!stored) {
      throw new Error('EXPIRED_OR_INVALID_OTP');
    }

    // 2. Find or Create User Record
    let user = await UserModel.findOne({ email: normalizedEmail });
    if (!user) {
      user = await UserModel.create({
        email: normalizedEmail,
        name: normalizedEmail.split('@')[0],
        currency: 'INR',
      });
      logger.info({ userId: user._id, email: normalizedEmail }, 'Created new authenticated user record');
    }

    // 3. Generate Signed JWT Session Token
    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: 'USER' },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        currency: user.currency,
      },
    };
  }

  /**
   * Device token registration for Apple Shortcuts webhook authorization.
   */
  async registerDeviceToken(userId: string, deviceTokenStr: string, deviceName: string) {
    const record = await DeviceTokenModel.findOneAndUpdate(
      { deviceToken: deviceTokenStr },
      {
        userId,
        deviceToken: deviceTokenStr,
        deviceName,
        platform: 'ios',
        lastActiveAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return record;
  }
}
