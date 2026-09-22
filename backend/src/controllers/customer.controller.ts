import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { success, error } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { createCustomerSchema, updateCustomerSchema } from '../validators/customer.validator';

// GET /api/customers
export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const search = (req.query.search as string) || '';

  const where: any = { businessId, status: true };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { _count: { select: { sales: true } } },
  });

  return success(res, { customers });
});

// GET /api/customers/:id
export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const id = String(req.params.id);

  const customer = await prisma.customer.findFirst({
    where: { id, businessId },
    include: {
      sales: {
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      },
    },
  });
  if (!customer) return error(res, 'Customer not found', 404);
  return success(res, { customer });
});

// POST /api/customers
export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const parsed = createCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
  }
  const d = parsed.data;

  const customer = await prisma.customer.create({
    data: {
      businessId,
      name: d.name,
      phone: d.phone || null,
      email: d.email || null,
      address: d.address || null,
      creditLimit: d.creditLimit,
    },
  });
  return success(res, { customer }, 'Customer created', 201);
});

// PUT /api/customers/:id
export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const id = String(req.params.id);

  const parsed = updateCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
  }

  const existing = await prisma.customer.findFirst({ where: { id, businessId } });
  if (!existing) return error(res, 'Customer not found', 404);

  const d = parsed.data;
  const customer = await prisma.customer.update({
    where: { id },
    data: {
      name: d.name,
      phone: d.phone === '' ? null : d.phone,
      email: d.email === '' ? null : d.email,
      address: d.address === '' ? null : d.address,
      creditLimit: d.creditLimit,
      status: d.status,
    },
  });
  return success(res, { customer }, 'Customer updated');
});

// DELETE /api/customers/:id
export const deleteCustomer = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const id = String(req.params.id);

  const existing = await prisma.customer.findFirst({ where: { id, businessId } });
  if (!existing) return error(res, 'Customer not found', 404);

  // Soft delete
  await prisma.customer.update({
    where: { id },
    data: { status: false },
  });
  return success(res, null, 'Customer deleted');
});
