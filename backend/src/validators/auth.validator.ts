import { z } from 'zod';
import { sanitizeString } from '../utils/sanitize';

export const registerSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters').transform(sanitizeString),
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters').transform(sanitizeString),
  email: z.string().trim().toLowerCase().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().min(10, 'Phone must be at least 10 characters'),
  address: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
