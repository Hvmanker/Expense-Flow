import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncService } from '../sync.service.js';
import { TransactionModel } from '@expenseflow/database';
import { SyncQueueItem } from '@expenseflow/shared-types';

describe('SyncService - Mass-Assignment and Allowlist Security', () => {
  let syncService: SyncService;
  const mockUserId = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    syncService = new SyncService();
    vi.restoreAllMocks();
  });

  it('should only update allowlisted fields (category, purpose, notes, status) and discard unauthorized fields', async () => {
    const findOneAndUpdateSpy = vi.spyOn(TransactionModel, 'findOneAndUpdate').mockResolvedValue({} as any);

    const changes: SyncQueueItem[] = [
      {
        queueId: 'q-update-1',
        entityId: '507f1f77bcf86cd799439012',
        entityType: 'TRANSACTION',
        operation: 'UPDATE',
        clientTimestamp: new Date().toISOString(),
        payload: {
          category: 'Food & Dining',
          purpose: 'Team Dinner',
          notes: 'Dinner at Olive',
          // Unauthorized fields that MUST NOT be updated via sync
          userId: 'attacker-user-id',
          _id: 'malicious-id',
          amount: 0.01,
          fingerprint: 'tampered-fingerprint',
          merchant: 'Malicious Merchant',
        },
      },
    ];

    const result = await syncService.processPushChanges(mockUserId, changes);

    expect(result.syncedIds).toEqual(['q-update-1']);
    expect(result.conflicts).toHaveLength(0);

    expect(findOneAndUpdateSpy).toHaveBeenCalledTimes(1);
    const updateCallArgs = findOneAndUpdateSpy.mock.calls[0];

    // Filter must scope by authenticated userId
    expect(updateCallArgs[0]).toEqual({
      _id: '507f1f77bcf86cd799439012',
      userId: expect.anything(),
    });

    const updateDoc = updateCallArgs[1] as any;
    expect(updateDoc.$set.category).toBe('Food & Dining');
    expect(updateDoc.$set.purpose).toBe('Team Dinner');
    expect(updateDoc.$set.notes).toBe('Dinner at Olive');
    expect(updateDoc.$set.syncStatus).toBe('SYNCED');

    // Assert unauthorized fields are stripped and never passed to $set
    expect(updateDoc.$set.userId).toBeUndefined();
    expect(updateDoc.$set._id).toBeUndefined();
    expect(updateDoc.$set.amount).toBeUndefined();
    expect(updateDoc.$set.fingerprint).toBeUndefined();
    expect(updateDoc.$set.merchant).toBeUndefined();
  });

  it('should only set allowlisted fields on transaction CREATE operations and enforce authenticated userId', async () => {
    const createSpy = vi.spyOn(TransactionModel, 'create').mockResolvedValue({} as any);

    const changes: SyncQueueItem[] = [
      {
        queueId: 'q-create-1',
        entityId: 'local-temp-id',
        entityType: 'TRANSACTION',
        operation: 'CREATE',
        clientTimestamp: new Date().toISOString(),
        payload: {
          fingerprint: 'valid-fp-123',
          amount: 500,
          currency: 'INR',
          merchant: 'Starbucks',
          bank: 'HDFC',
          paymentMethod: 'UPI',
          occurredAt: new Date().toISOString(),
          // Attempted identity spoofing
          userId: 'spoofed-user-id',
        },
      },
    ];

    const result = await syncService.processPushChanges(mockUserId, changes);

    expect(result.syncedIds).toEqual(['q-create-1']);
    expect(createSpy).toHaveBeenCalledTimes(1);

    const createCallArgs = createSpy.mock.calls[0][0] as any;
    expect(createCallArgs.amount).toBe(500);
    expect(createCallArgs.merchant).toBe('Starbucks');
    expect(createCallArgs.currency).toBe('INR');

    // userId must be the authenticated userObjectId, NOT the client-provided spoofed-user-id
    expect(createCallArgs.userId.toString()).toBe(mockUserId);
  });
});
