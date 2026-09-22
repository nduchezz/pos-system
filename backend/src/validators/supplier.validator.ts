import { z } from 'zod';

export const createSupplierSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  contactPerson: z.string().max(100).optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().max(255).optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
});

export const updateSupplierSchema = createSupplierSchema.partial().extend({
  status: z.boolean().optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
