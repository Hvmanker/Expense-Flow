import { z } from 'zod';

export const UserDTOSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatarUrl: z.string().optional(),
  currency: z.string().default('INR'),
  locale: z.string().default('en-IN'),
  timezone: z.string().default('Asia/Kolkata'),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type UserDTO = z.infer<typeof UserDTOSchema>;
