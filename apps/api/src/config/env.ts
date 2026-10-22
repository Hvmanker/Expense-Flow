import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z
    .string()
    .default('mongodb://localhost:27017/expenseflow'),
  REDIS_URL: z
    .string()
    .default('redis://localhost:6379'),
  JWT_SECRET: z
    .string()
    .min(16, 'JWT_SECRET must be at least 16 characters')
    .default('supersecret_jwt_access_key_change_in_production_32bytes'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, 'JWT_REFRESH_SECRET must be at least 16 characters')
    .default('supersecret_jwt_refresh_key_change_in_production'),
  ENCRYPTION_KEY: z
    .string()
    .default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  OLLAMA_HOST: z
    .string()
    .default('http://localhost:11434'),
  CORS_ORIGIN: z
    .string()
    .default('*'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid application configuration:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

// Runtime production security guard
if (env.NODE_ENV === 'production') {
  const unsafeProductionSettings = [
    env.JWT_SECRET.includes('supersecret_jwt') ? 'JWT_SECRET' : null,
    env.JWT_REFRESH_SECRET.includes('supersecret_jwt') ? 'JWT_REFRESH_SECRET' : null,
    env.ENCRYPTION_KEY === '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
      ? 'ENCRYPTION_KEY'
      : null,
    env.CORS_ORIGIN === '*' ? 'CORS_ORIGIN' : null,
  ].filter(Boolean);

  if (unsafeProductionSettings.length > 0) {
    console.error(
      `FATAL: Unsafe production configuration: ${unsafeProductionSettings.join(', ')}`
    );
    process.exit(1);
  }
}
