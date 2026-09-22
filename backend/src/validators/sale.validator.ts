import { z } from 'zod';

const paymentMethodEnum = z.enum(['CASH', 'MPESA', 'CARD', 'BANK', 'CREDIT']);

export const createSaleSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive(),
      discount: z.number().nonnegative().default(0),
    })
  ).min(1, 'Cart cannot be empty'),

  customerId: z.string().uuid().optional().nullable(),
  cartDiscount: z.number().nonnegative().default(0),

  paymentMethod: paymentMethodEnum,
  amountReceived: z.number().nonnegative(),

  paymentReference: z.string().max(50).optional(),
  paymentPhone: z.string().max(20).optional(),

  notes: z.string().max(255).optional(),

  // 🔑 Idempotency key (client-generated UUID)
  clientTransactionId: z.string().uuid().optional(),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
