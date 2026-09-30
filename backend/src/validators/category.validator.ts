import { z } from 'zod';
import { sanitizeString, sanitizeOptionalString } from '../utils/sanitize';

export const createCategorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50).transform(sanitizeString),
  description: z.string().max(255).optional().or(z.literal('')).transform(sanitizeOptionalString),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).max(50).transform(sanitizeString).optional(),
  description: z.string().max(255).optional().or(z.literal('')).transform(sanitizeOptionalString),
  status: z.boolean().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
