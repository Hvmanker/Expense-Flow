import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processCategorizationJob } from '../categorization.worker.js';
import { TransactionModel, MerchantModel } from '@expenseflow/database';

describe('BullMQ Categorization Worker', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should process job and apply heuristic fallback when Ollama is unreachable', async () => {
    const mockJob = {
      data: {
        transactionId: '507f1f77bcf86cd799439011',
        userId: '507f191e810c19729de860ea',
        rawSMS: 'Sent Rs. 450.00 from HDFC Bank to starbucks@upi',
        merchant: 'STARBUCKS COFFEE',
        amount: 450,
        paymentMethod: 'UPI',
        bank: 'HDFC',
      },
    } as any;

    const findByIdAndUpdateSpy = vi
      .spyOn(TransactionModel, 'findByIdAndUpdate')
      .mockResolvedValue({} as any);

    const findOneAndUpdateSpy = vi
      .spyOn(MerchantModel, 'findOneAndUpdate')
      .mockResolvedValue({} as any);

    await processCategorizationJob(mockJob);

    expect(findByIdAndUpdateSpy).toHaveBeenCalledTimes(1);
    const updatePayload = findByIdAndUpdateSpy.mock.calls[0][1] as any;
    expect(updatePayload.$set.category).toBe('Food & Dining');
    expect(updatePayload.$set.aiConfidence).toBeGreaterThanOrEqual(0.8);

    expect(findOneAndUpdateSpy).toHaveBeenCalledTimes(1);
  });
});
