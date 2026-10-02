import { z } from 'zod';

export const EventTypeSchema = z.enum([
  'TransactionCreated',
  'TransactionUpdated',
  'PurposeAssigned',
  'MerchantLearned',
  'BudgetExceeded',
  'SubscriptionDetected',
  'NotificationScheduled',
]);

export type EventType = z.infer<typeof EventTypeSchema>;

export const DomainEventSchema = z.object({
  id: z.string(),
  transactionId: z.string().optional(),
  userId: z.string(),
  eventType: EventTypeSchema,
  payload: z.record(z.any()),
  timestamp: z.string(),
});

export type DomainEvent = z.infer<typeof DomainEventSchema>;
