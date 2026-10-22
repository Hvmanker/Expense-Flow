import { Worker, Job } from 'bullmq';
import { logger } from '@expenseflow/logger';
import { buildCategorizerPrompt } from '@expenseflow/ai-prompts';
import { resolveCanonicalMerchant } from '@expenseflow/parser-engine';
import { TransactionModel, MerchantModel } from '@expenseflow/database';
import { env } from '../config/env.js';
import {
  TRANSACTION_CATEGORIZATION_QUEUE,
  CategorizationJobData,
  getCategorizationDeadLetterQueue,
} from '../queues/transaction.queue.js';

let categorizationWorker: Worker<CategorizationJobData> | null = null;

function getRedisConnectionOptions() {
  const url = new URL(env.REDIS_URL);
  return {
    host: url.hostname || 'localhost',
    port: parseInt(url.port || '6379', 10),
    maxRetriesPerRequest: null,
  };
}

export async function processCategorizationJob(job: Job<CategorizationJobData>): Promise<void> {
  const { transactionId, userId, rawSMS, merchant, amount, paymentMethod, bank } = job.data;
  logger.info({ transactionId, merchant }, 'Processing AI categorization job');

  let category = 'Miscellaneous';
  let subcategory: string | undefined;
  let purpose: string | undefined;
  let confidence = 0.7;
  let reasoning = 'Rule-based heuristic fallback';
  let tags: string[] = [];

  // 1. Attempt Local Ollama LLM Inference
  try {
    const promptText = buildCategorizerPrompt({
      rawSMS,
      merchant,
      amount,
      paymentMethod,
      bank,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const response = await fetch(`${env.OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5:14b',
        prompt: promptText,
        stream: false,
        format: 'json',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data: any = await response.json();
      const parsedAi = typeof data.response === 'string' ? JSON.parse(data.response) : data.response;

      if (parsedAi && parsedAi.category) {
        category = parsedAi.category;
        subcategory = parsedAi.subcategory;
        purpose = parsedAi.suggestedPurpose;
        confidence = typeof parsedAi.confidence === 'number' ? parsedAi.confidence : 0.95;
        reasoning = parsedAi.reasoning || 'Categorized by Ollama Qwen2.5';
        tags = Array.isArray(parsedAi.suggestedTags) ? parsedAi.suggestedTags : [];
        logger.info({ transactionId, category, confidence }, 'Ollama AI categorization successful');
      }
    }
  } catch (err: any) {
    logger.warn({ err: err.message, transactionId }, 'Ollama offline or timed out — applying canonical parser heuristics');

    // Heuristic Fallback
    const canonical = resolveCanonicalMerchant(merchant);
    category = canonical.category;
    confidence = 0.85;
    reasoning = `Canonical merchant match: ${canonical.canonicalName}`;
  }

  // 2. Update Transaction Document
  await TransactionModel.findByIdAndUpdate(transactionId, {
    $set: {
      category,
      subcategory,
      purpose,
      tags,
      aiConfidence: confidence,
      aiSuggestion: {
        category,
        subcategory,
        purpose,
        confidence,
        reasoning,
      },
    },
  });

  // 3. Update Merchant Memory Model
  const normalizedMerchant = merchant.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  await MerchantModel.findOneAndUpdate(
    { userId, normalizedName: normalizedMerchant },
    {
      $set: {
        rawName: merchant,
        normalizedName: normalizedMerchant,
        defaultCategory: category,
        defaultSubcategory: subcategory,
        lastSpentAt: new Date(),
      },
      $inc: {
        totalSpend: amount,
        transactionCount: 1,
      },
    },
    { upsert: true }
  );

  logger.info({ transactionId, category }, 'Transaction categorization updated successfully');
}

export function isTerminalFailure(job: Pick<Job, 'attemptsMade' | 'opts'>): boolean {
  const maxAttempts = Math.max(1, Number(job.opts.attempts ?? 1));
  return job.attemptsMade >= maxAttempts;
}

async function sendTerminalFailureAlert(payload: Record<string, unknown>): Promise<void> {
  if (!env.QUEUE_ALERT_WEBHOOK_URL) {
    logger.error(payload, 'Queue alert webhook is not configured');
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(env.QUEUE_ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Alert webhook returned HTTP ${response.status}`);
  } catch (error: any) {
    logger.error({ ...payload, alertError: error.message }, 'Failed to deliver terminal queue alert');
  } finally {
    clearTimeout(timeout);
  }
}

export async function handleCategorizationFailure(
  job: Job<CategorizationJobData> | undefined,
  error: Error
): Promise<void> {
  if (!job) {
    logger.error({ err: error.message }, 'Categorization worker failed without job context');
    return;
  }

  const terminal = isTerminalFailure(job);
  logger.error(
    { jobId: job.id, transactionId: job.data.transactionId, attemptsMade: job.attemptsMade, terminal, err: error.message },
    'Categorization job failed'
  );
  if (!terminal) return;

  const failedAt = new Date().toISOString();
  const payload = {
    queue: TRANSACTION_CATEGORIZATION_QUEUE,
    originalJobId: job.id,
    transactionId: job.data.transactionId,
    attemptsMade: job.attemptsMade,
    failedReason: error.message,
    failedAt,
  };
  await getCategorizationDeadLetterQueue().add('terminal-failure', {
    ...payload,
    originalData: job.data,
  }, {
    jobId: `${job.id ?? job.data.transactionId}-failed-${Date.now()}`,
    removeOnComplete: false,
    removeOnFail: false,
  });
  await sendTerminalFailureAlert(payload);
}

export function startCategorizationWorker(): Worker<CategorizationJobData> {
  if (!categorizationWorker) {
    categorizationWorker = new Worker<CategorizationJobData>(
      TRANSACTION_CATEGORIZATION_QUEUE,
      processCategorizationJob,
      {
        connection: getRedisConnectionOptions(),
        concurrency: env.QUEUE_CONCURRENCY,
        limiter: {
          max: env.QUEUE_RATE_LIMIT_MAX,
          duration: env.QUEUE_RATE_LIMIT_DURATION_MS,
        },
      }
    );

    categorizationWorker.on('completed', (job) => {
      logger.info({ jobId: job.id }, 'Categorization job completed');
    });

    categorizationWorker.on('failed', (job, err) => {
      void handleCategorizationFailure(job, err).catch((handlerError: any) => {
        logger.error(
          { jobId: job?.id, err: handlerError.message },
          'Failed to persist terminal categorization failure'
        );
      });
    });

    logger.info({
      concurrency: env.QUEUE_CONCURRENCY,
      rateLimitMax: env.QUEUE_RATE_LIMIT_MAX,
      rateLimitDurationMs: env.QUEUE_RATE_LIMIT_DURATION_MS,
    }, 'BullMQ Categorization Worker started');
  }

  return categorizationWorker;
}

export async function closeCategorizationWorker(): Promise<void> {
  if (categorizationWorker) {
    await categorizationWorker.close();
    categorizationWorker = null;
  }
}
