import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { success, error } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { z } from 'zod';

const updateBusinessSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  ownerName: z.string().min(2).max(100).optional(),
  phone: z.string().min(10).max(20).optional(),
  email: z.string().email().optional(),
  address: z.string().max(255).optional().or(z.literal('')),
  currency: z.string().max(5).optional(),
  taxEnabled: z.boolean().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  taxIncluded: z.boolean().optional(),
  receiptFooter: z.string().max(255).optional().or(z.literal('')),
});

// GET /api/business
export const getBusiness = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return error(res, 'Business not found', 404);
  return success(res, { business });
});

// PUT /api/business
export const updateBusiness = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;

  const parsed = updateBusinessSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
  }
  const d = parsed.data;

  const business = await prisma.business.update({
    where: { id: businessId },
    data: {
      name: d.name,
      ownerName: d.ownerName,
      phone: d.phone,
      email: d.email,
      address: d.address === '' ? null : d.address,
      currency: d.currency,
      taxEnabled: d.taxEnabled,
      taxRate: d.taxRate,
      taxIncluded: d.taxIncluded,
      receiptFooter: d.receiptFooter === '' ? null : d.receiptFooter,
    },
  });
  return success(res, { business }, 'Business updated');
});
