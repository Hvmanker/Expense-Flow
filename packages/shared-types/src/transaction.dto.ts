import { z } from 'zod';

export const PaymentMethodSchema = z.enum([
  'UPI',
  'CREDIT_CARD',
  'DEBIT_CARD',
  'NET_BANKING',
  'WALLET',
  'CASH',
]);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const TransactionStatusSchema = z.enum([
  'PENDING_APPROVAL',
  'CONFIRMED',
  'IGNORED',
  'FLAGGED',
  'CAPTURED',
  'PENDING_CATEGORY',
  'COMPLETED',
  'ARCHIVED',
]);
export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;

export const SyncStatusSchema = z.enum(['SYNCED', 'PENDING', 'PENDING_UPLOAD', 'FAILED', 'CONFLICT']);
export type SyncStatus = z.infer<typeof SyncStatusSchema>;

export const AISuggestionSchema = z.object({
  category: z.string(),
  subcategory: z.string().optional(),
  purpose: z.string().optional(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
  suggestedTags: z.array(z.string()).optional(),
});
export type AISuggestion = z.infer<typeof AISuggestionSchema>;

export const TransactionDTOSchema = z.object({
  id: z.string(),
  userId: z.string(),
  fingerprint: z.string(),
  amount: z.number().positive(),
  currency: z.string().default('INR'),
  merchant: z.string(),
  merchantId: z.string().optional(),
  bank: z.string(),
  paymentMethod: PaymentMethodSchema,
  accountMasked: z.string().optional(),
  reference: z.string().optional(),
  occurredAt: z.string(), // ISO-8601 string
  timezone: z.string().default('Asia/Kolkata'),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  purpose: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  aiSuggestion: AISuggestionSchema.optional(),
  aiConfidence: z.number().min(0).max(1).optional(),
  status: TransactionStatusSchema,
  syncStatus: SyncStatusSchema,
  metadata: z.record(z.any()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TransactionDTO = z.infer<typeof TransactionDTOSchema>;

export const SMSIngestionPayloadSchema = z.object({
  rawText: z.string().min(1),
  sender: z.string().min(1),
  timestamp: z.string().optional(),
  bankHint: z.string().optional(),
  source: z.literal('APPLE_SHORTCUTS').default('APPLE_SHORTCUTS'),
});

export type SMSIngestionPayload = z.infer<typeof SMSIngestionPayloadSchema>;

export const UpdateTransactionDTOSchema = z.object({
  category: z.string().optional(),
  subcategory: z.string().optional(),
  purpose: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: TransactionStatusSchema.optional(),
  syncStatus: SyncStatusSchema.optional(),
});

export type UpdateTransactionDTO = z.infer<typeof UpdateTransactionDTOSchema>;
