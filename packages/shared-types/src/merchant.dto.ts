import { z } from 'zod';

export const MerchantDTOSchema = z.object({
  id: z.string(),
  userId: z.string(),
  rawName: z.string(),
  normalizedName: z.string(),
  defaultCategory: z.string(),
  defaultSubcategory: z.string().optional(),
  preferredTags: z.array(z.string()).default([]),
  totalSpend: z.number().default(0),
  transactionCount: z.number().default(0),
  confidenceScore: z.number().min(0).max(1).default(1.0),
  lastSpentAt: z.string(),
});

export type MerchantDTO = z.infer<typeof MerchantDTOSchema>;
