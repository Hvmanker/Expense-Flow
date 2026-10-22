import { Queue } from 'bullmq';
import { logger } from '@expenseflow/logger';
import { env } from '../config/env.js';

export const TRANSACTION_CATEGORIZATION_QUEUE = 'transaction-categorization';

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
        attempts: 3,
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
}
