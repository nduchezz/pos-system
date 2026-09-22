import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().max(20).optional().or(z.literal('')),
  role: z.enum(['ADMIN', 'CASHIER']).default('CASHIER'),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().max(20).optional().or(z.literal('')),
  role: z.enum(['ADMIN', 'CASHIER']).optional(),
  status: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});
