import { z } from 'zod';

const paymentMethodEnum = z.enum(['CASH', 'MPESA', 'CARD', 'BANK', 'CREDIT']);

export const createExpenseSchema = z.object({
  category: z.string().min(2, 'Category required').max(50),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().max(255).optional().or(z.literal('')),
  paymentMethod: paymentMethodEnum.default('CASH'),
  date: z.string().datetime().optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
