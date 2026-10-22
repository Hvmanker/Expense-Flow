import { Worker, Job } from 'bullmq';
import { logger } from '@expenseflow/logger';
import { buildCategorizerPrompt } from '@expenseflow/ai-prompts';
import { resolveCanonicalMerchant } from '@expenseflow/parser-engine';
import { TransactionModel, MerchantModel } from '@expenseflow/database';
import { env } from '../config/env.js';
import { TRANSACTION_CATEGORIZATION_QUEUE, CategorizationJobData } from '../queues/transaction.queue.js';

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

export function startCategorizationWorker(): Worker<CategorizationJobData> {
  if (!categorizationWorker) {
    categorizationWorker = new Worker<CategorizationJobData>(
      TRANSACTION_CATEGORIZATION_QUEUE,
      processCategorizationJob,
      {
        connection: getRedisConnectionOptions(),
        concurrency: 5,
      }
    );

    categorizationWorker.on('completed', (job) => {
      logger.info({ jobId: job.id }, 'Categorization job completed');
    });

    categorizationWorker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, err: err.message }, 'Categorization job failed');
    });

    logger.info('BullMQ Categorization Worker started with concurrency 5');
  }

  return categorizationWorker;
}

export async function closeCategorizationWorker(): Promise<void> {
  if (categorizationWorker) {
    await categorizationWorker.close();
    categorizationWorker = null;
  }
}
