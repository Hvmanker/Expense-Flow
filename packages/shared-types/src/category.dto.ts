import { z } from 'zod';

export const CategoryDTOSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  name: z.string().min(1),
  parentId: z.string().nullable().optional(),
  icon: z.string().default('tag'),
  color: z.string().default('#6B7280'),
  budgetMappingId: z.string().optional(),
  isSystem: z.boolean().default(false),
  order: z.number().default(0),
});

export type CategoryDTO = z.infer<typeof CategoryDTOSchema>;
