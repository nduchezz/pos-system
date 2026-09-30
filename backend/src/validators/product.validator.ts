import { sanitizeString, sanitizeOptionalString } from '../utils/sanitize';
import { z } from 'zod';

const unitEnum = z.enum(['PIECE', 'BOX', 'PACKET', 'KILOGRAM', 'GRAM', 'LITRE', 'BOTTLE', 'METRE']);

export const createProductSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100).transform(sanitizeString),
  sku: z.string().min(1, 'SKU is required').max(50).transform((s) => s.trim().toUpperCase()),
  barcode: z.string().max(50).optional().or(z.literal('')),
  categoryId: z.string().uuid().optional().nullable(),
  supplierId: z.string().uuid().optional().nullable(),
    description: z.string().max(500).optional().or(z.literal('')).transform(sanitizeOptionalString),
  buyingPrice: z.number().nonnegative('Buying price cannot be negative'),
  sellingPrice: z.number().nonnegative('Selling price cannot be negative'),
  stockQuantity: z.number().int().nonnegative().default(0),
  minStock: z.number().int().nonnegative().default(5),
  unit: unitEnum.default('PIECE'),
});

export const updateProductSchema = createProductSchema.partial().extend({
  status: z.boolean().optional(),
});

export const adjustStockSchema = z.object({
  quantity: z.number().int(),
  movementType: z.enum(['PURCHASE', 'ADJUSTMENT', 'DAMAGE', 'LOSS', 'RETURN']),
  reason: z.string().max(255).optional(),
});

export const listProductsQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  lowStock: z.enum(['true', 'false']).optional(),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
