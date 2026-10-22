import { Queue } from 'bullmq';
import { logger } from '@expenseflow/logger';
import { env } from '../config/env.js';

export const TRANSACTION_CATEGORIZATION_QUEUE = 'transaction-categorization';
export const TRANSACTION_CATEGORIZATION_DLQ = 'transaction-categorization-dlq';
export const CATEGORIZATION_MAX_ATTEMPTS = 5;

export interface CategorizationJobData {
  transactionId: string;
  userId: string;
  rawSMS: string;
  merchant: string;
  amount: number;
  paymentMethod: string;
  bank: string;
}

let categorizationQueue: Queue<CategorizationJobData> | null = null;
let categorizationDeadLetterQueue: Queue | null = null;

function getRedisConnectionOptions() {
  const url = new URL(env.REDIS_URL);
  return {
    host: url.hostname || 'localhost',
    port: parseInt(url.port || '6379', 10),
    maxRetriesPerRequest: null,
  };
}

export function getTransactionQueue(): Queue<CategorizationJobData> {
  if (!categorizationQueue) {
    categorizationQueue = new Queue<CategorizationJobData>(TRANSACTION_CATEGORIZATION_QUEUE, {
      connection: getRedisConnectionOptions(),
      defaultJobOptions: {
        attempts: CATEGORIZATION_MAX_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });

    categorizationQueue.on('error', (err) => {
      logger.warn({ err: err.message }, 'Transaction queue warning');
    });
  }

  return categorizationQueue;
}

export function getCategorizationDeadLetterQueue(): Queue {
  if (!categorizationDeadLetterQueue) {
    categorizationDeadLetterQueue = new Queue(TRANSACTION_CATEGORIZATION_DLQ, {
      connection: getRedisConnectionOptions(),
      defaultJobOptions: {
        removeOnComplete: 1000,
        removeOnFail: false,
      },
    });
  }
  return categorizationDeadLetterQueue;
}

export async function enqueueCategorization(data: CategorizationJobData): Promise<string | undefined> {
  try {
    const queue = getTransactionQueue();
    const job = await queue.add('categorize', data, {
      jobId: `cat-${data.transactionId}`,
    });
    logger.info({ jobId: job.id, transactionId: data.transactionId }, 'Enqueued transaction categorization job');
    return job.id;
  } catch (err: any) {
    logger.warn({ err: err.message, transactionId: data.transactionId }, 'Failed to enqueue categorization job (continuing with offline fallback)');
    return undefined;
  }
}

export async function closeTransactionQueue(): Promise<void> {
  if (categorizationQueue) {
    await categorizationQueue.close();
    categorizationQueue = null;
  }
  if (categorizationDeadLetterQueue) {
    await categorizationDeadLetterQueue.close();
    categorizationDeadLetterQueue = null;
  }
}
