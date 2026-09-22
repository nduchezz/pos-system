import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { success, error } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { createSupplierSchema, updateSupplierSchema } from '../validators/supplier.validator';

// GET /api/suppliers
export const listSuppliers = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const search = (req.query.search as string) || '';

  const where: any = { businessId, status: true };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { contactPerson: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ];
  }

  const suppliers = await prisma.supplier.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  return success(res, { suppliers });
});

// GET /api/suppliers/:id
export const getSupplier = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const id = String(req.params.id);

  const supplier = await prisma.supplier.findFirst({
    where: { id, businessId },
    include: { products: { take: 20 } },
  });
  if (!supplier) return error(res, 'Supplier not found', 404);
  return success(res, { supplier });
});

// POST /api/suppliers
export const createSupplier = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const parsed = createSupplierSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
  }
  const d = parsed.data;

  const supplier = await prisma.supplier.create({
    data: {
      businessId,
      name: d.name,
      contactPerson: d.contactPerson || null,
      phone: d.phone || null,
      email: d.email || null,
      address: d.address || null,
      notes: d.notes || null,
    },
  });
  return success(res, { supplier }, 'Supplier created', 201);
});

// PUT /api/suppliers/:id
export const updateSupplier = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const id = String(req.params.id);

  const parsed = updateSupplierSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
  }

  const existing = await prisma.supplier.findFirst({ where: { id, businessId } });
  if (!existing) return error(res, 'Supplier not found', 404);

  const d = parsed.data;
  const supplier = await prisma.supplier.update({
    where: { id },
    data: {
      name: d.name,
      contactPerson: d.contactPerson === '' ? null : d.contactPerson,
      phone: d.phone === '' ? null : d.phone,
      email: d.email === '' ? null : d.email,
      address: d.address === '' ? null : d.address,
      notes: d.notes === '' ? null : d.notes,
      status: d.status,
    },
  });
  return success(res, { supplier }, 'Supplier updated');
});

// DELETE /api/suppliers/:id
export const deleteSupplier = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const id = String(req.params.id);

  const existing = await prisma.supplier.findFirst({ where: { id, businessId } });
  if (!existing) return error(res, 'Supplier not found', 404);

  await prisma.supplier.update({
    where: { id },
    data: { status: false },
  });
  return success(res, null, 'Supplier deleted');
});
