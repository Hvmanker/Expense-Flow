import { z } from 'zod';

export const AIChatRequestSchema = z.object({
  query: z.string().min(1),
  conversationId: z.string().optional(),
});

export type AIChatRequest = z.infer<typeof AIChatRequestSchema>;

export const AIChatResponseSchema = z.object({
  answer: z.string(),
  sources: z.array(z.record(z.any())).optional(),
  conversationId: z.string(),
});

export type AIChatResponse = z.infer<typeof AIChatResponseSchema>;
