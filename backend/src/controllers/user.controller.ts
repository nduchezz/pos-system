import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { hashPassword } from '../utils/password';
import { success, error } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { createUserSchema, updateUserSchema, changePasswordSchema } from '../validators/user.validator';

// GET /api/users
export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const users = await prisma.user.findMany({
    where: { businessId, deletedAt: null },
    select: {
      id: true, email: true, name: true, phone: true, role: true,
      status: true, lastLogin: true, createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  return success(res, { users });
});

// POST /api/users
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
  }
  const d = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: d.email } });
  if (existing) return error(res, 'Email already in use', 409);

  const passwordHash = await hashPassword(d.password);
  const user = await prisma.user.create({
    data: {
      businessId,
      email: d.email,
      passwordHash,
      name: d.name,
      phone: d.phone || null,
      role: d.role,
    },
    select: {
      id: true, email: true, name: true, phone: true,
      role: true, status: true, createdAt: true,
    },
  });
  return success(res, { user }, 'User created', 201);
});

// PUT /api/users/:id
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const requesterId = req.user!.userId;
  const id = String(req.params.id);

  if (id === requesterId && req.body.role && req.body.role !== 'ADMIN') {
    return error(res, 'You cannot change your own role', 400);
  }

  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
  }
  const d = parsed.data;

  const existing = await prisma.user.findFirst({ where: { id, businessId } });
  if (!existing) return error(res, 'User not found', 404);

  const user = await prisma.user.update({
    where: { id },
    data: {
      name: d.name,
      phone: d.phone === '' ? null : d.phone,
      role: d.role,
      status: d.status,
    },
    select: {
      id: true, email: true, name: true, phone: true,
      role: true, status: true, createdAt: true,
    },
  });
  return success(res, { user }, 'User updated');
});

// PUT /api/users/:id/password
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const id = String(req.params.id);

  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
  }

  const existing = await prisma.user.findFirst({ where: { id, businessId } });
  if (!existing) return error(res, 'User not found', 404);

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
  return success(res, null, 'Password updated');
});

// DELETE /api/users/:id
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const requesterId = req.user!.userId;
  const id = String(req.params.id);

  if (id === requesterId) return error(res, 'You cannot delete yourself', 400);

  const existing = await prisma.user.findFirst({ where: { id, businessId } });
  if (!existing) return error(res, 'User not found', 404);

  await prisma.user.update({
    where: { id },
    data: { status: false, deletedAt: new Date() },
  });
  return success(res, null, 'User deactivated');
});
