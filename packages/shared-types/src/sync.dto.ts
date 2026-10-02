import { z } from 'zod';

export const SyncOperationSchema = z.enum(['CREATE', 'UPDATE', 'DELETE']);
export type SyncOperation = z.infer<typeof SyncOperationSchema>;

export const SyncEntityTypeSchema = z.enum(['TRANSACTION', 'CATEGORY', 'MERCHANT']);
export type SyncEntityType = z.infer<typeof SyncEntityTypeSchema>;

export const SyncQueueItemSchema = z.object({
  queueId: z.string(),
  entityId: z.string(),
  entityType: SyncEntityTypeSchema,
  operation: SyncOperationSchema,
  payload: z.record(z.any()),
  clientTimestamp: z.string(),
});

export type SyncQueueItem = z.infer<typeof SyncQueueItemSchema>;

export const SyncPushPayloadSchema = z.object({
  changes: z.array(SyncQueueItemSchema),
});

export type SyncPushPayload = z.infer<typeof SyncPushPayloadSchema>;

export const SyncPullPayloadSchema = z.object({
  lastSyncTimestamp: z.string(),
});

export type SyncPullPayload = z.infer<typeof SyncPullPayloadSchema>;
