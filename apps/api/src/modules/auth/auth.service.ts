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
const memorySendWindows = new Map<string, { count: number; expiresAt: number; cooldownUntil: number }>();
const memoryVerifyAttempts = new Map<string, { count: number; expiresAt: number }>();
const OTP_TTL_SECONDS = 600; // 10 minutes
const OTP_SEND_WINDOW_SECONDS = 3600;
const OTP_SEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_SENDS_PER_WINDOW = 5;
const OTP_MAX_VERIFY_ATTEMPTS = 5;
const SEND_RATE_LIMIT_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 1 then
  return -1
end
local count = redis.call('INCR', KEYS[2])
if count == 1 then
  redis.call('EXPIRE', KEYS[2], ARGV[1])
end
if count > tonumber(ARGV[2]) then
  return -2
end
redis.call('SET', KEYS[1], '1', 'EX', ARGV[3])
return count
`;
const CONSUME_OTP_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then
  return '__MISSING__'
end
local data = cjson.decode(raw)
if data.otp ~= ARGV[1] and data.token ~= ARGV[1] then
  local attempts = redis.call('INCR', KEYS[2])
  if attempts == 1 then
    redis.call('EXPIRE', KEYS[2], ARGV[3])
  end
  if attempts >= tonumber(ARGV[2]) then
    redis.call('DEL', KEYS[1])
    redis.call('DEL', KEYS[2])
    return '__LOCKED__'
  end
  return '__INVALID__:' .. attempts
end
redis.call('DEL', KEYS[1])
redis.call('DEL', KEYS[2])
return raw
`;

function enforceMemorySendLimit(email: string, now = Date.now()): void {
  const current = memorySendWindows.get(email);
  const window = !current || current.expiresAt <= now
    ? { count: 0, expiresAt: now + OTP_SEND_WINDOW_SECONDS * 1000, cooldownUntil: 0 }
    : current;

  if (window.cooldownUntil > now) throw new Error('OTP_RESEND_TOO_SOON');
  if (window.count >= OTP_MAX_SENDS_PER_WINDOW) throw new Error('OTP_SEND_LIMIT_EXCEEDED');

  window.count += 1;
  window.cooldownUntil = now + OTP_SEND_COOLDOWN_SECONDS * 1000;
  memorySendWindows.set(email, window);
}

export class AuthService {
  /**
   * Generates single-use 6-digit OTP and secure magic link token, saves to Redis, and sends email.
   */
  async sendMagicLink(email: string): Promise<{ success: boolean; devOtp?: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const cooldownKey = `auth:otp:send:cooldown:${normalizedEmail}`;
    const sendWindowKey = `auth:otp:send:window:${normalizedEmail}`;

    if (isRedisConnected()) {
      const rateLimitResult = Number(await getRedisClient().eval(
        SEND_RATE_LIMIT_SCRIPT,
        2,
        cooldownKey,
        sendWindowKey,
        OTP_SEND_WINDOW_SECONDS,
        OTP_MAX_SENDS_PER_WINDOW,
        OTP_SEND_COOLDOWN_SECONDS
      ));
      if (rateLimitResult === -1) throw new Error('OTP_RESEND_TOO_SOON');
      if (rateLimitResult === -2) throw new Error('OTP_SEND_LIMIT_EXCEEDED');
    } else {
      enforceMemorySendLimit(normalizedEmail);
    }

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
    const attemptsKey = `auth:otp:attempts:${normalizedEmail}`;
    let stored: StoredOtpData | null = null;

    // 1. Atomically validate and consume Redis-backed credentials. The in-memory
    // fallback is synchronous until deletion, so it preserves the same single-use
    // behavior within this process.
    if (isRedisConnected()) {
      const raw = await getRedisClient().eval(
        CONSUME_OTP_SCRIPT,
        2,
        cacheKey,
        attemptsKey,
        codeOrToken,
        OTP_MAX_VERIFY_ATTEMPTS,
        OTP_TTL_SECONDS
      );
      if (raw === '__MISSING__' || raw === null) throw new Error('EXPIRED_OR_INVALID_OTP');
      if (raw === '__LOCKED__') throw new Error('TOO_MANY_OTP_ATTEMPTS');
      if (String(raw).startsWith('__INVALID__:')) throw new Error('INVALID_OTP');
      stored = JSON.parse(String(raw));
    } else {
      const mem = memoryOtpStore.get(normalizedEmail);
      if (mem && mem.expiresAt > Date.now()) {
        const isMatch = mem.otp === codeOrToken || mem.token === codeOrToken;
        if (!isMatch) {
          const previous = memoryVerifyAttempts.get(normalizedEmail);
          const attempts = !previous || previous.expiresAt <= Date.now()
            ? { count: 1, expiresAt: mem.expiresAt }
            : { ...previous, count: previous.count + 1 };
          if (attempts.count >= OTP_MAX_VERIFY_ATTEMPTS) {
            memoryVerifyAttempts.delete(normalizedEmail);
            memoryOtpStore.delete(normalizedEmail);
            throw new Error('TOO_MANY_OTP_ATTEMPTS');
          }
          memoryVerifyAttempts.set(normalizedEmail, attempts);
          throw new Error('INVALID_OTP');
        }
        memoryOtpStore.delete(normalizedEmail);
        memoryVerifyAttempts.delete(normalizedEmail);
        stored = mem;
      } else if (mem) {
        memoryOtpStore.delete(normalizedEmail);
        memoryVerifyAttempts.delete(normalizedEmail);
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
