import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { success, error } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { registerSchema, loginSchema } from '../validators/auth.validator';

// POST /api/auth/register
export const register = asyncHandler(async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
  }
  const { businessName, ownerName, email, password, phone, address } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return error(res, 'Email already registered', 409);
  }

  const passwordHash = await hashPassword(password);

  const result = await prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: {
        name: businessName,
        ownerName,
        email,
        phone,
        address,
      },
    });

    const user = await tx.user.create({
      data: {
        businessId: business.id,
        email,
        passwordHash,
        name: ownerName,
        phone,
        role: 'ADMIN',
      },
    });

    return { business, user };
  });

  const token = signToken({
    userId: result.user.id,
    businessId: result.business.id,
    role: result.user.role,
    email: result.user.email,
  });

  return success(
    res,
    {
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        businessId: result.business.id,
      },
      business: {
        id: result.business.id,
        name: result.business.name,
        currency: result.business.currency,
      },
    },
    'Account created successfully',
    201
  );
});

// POST /api/auth/login
export const login = asyncHandler(async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { business: true },
  });

  if (!user || !user.status) {
    return error(res, 'Invalid credentials', 401);
  }

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) {
    return error(res, 'Invalid credentials', 401);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  const token = signToken({
    userId: user.id,
    businessId: user.businessId,
    role: user.role,
    email: user.email,
  });

  return success(
    res,
    {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        businessId: user.businessId,
        phone: user.phone,
      },
      business: {
  id: user.business.id,
  name: user.business.name,
  currency: user.business.currency,
  taxRate: user.business.taxRate,
  taxIncluded: user.business.taxIncluded,
  taxEnabled: user.business.taxEnabled,
},
    },
    'Login successful'
  );
});

// GET /api/auth/me  (protected)
export const me = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { business: true },
  });

  if (!user) return error(res, 'User not found', 404);

  const { passwordHash, ...safeUser } = user;

  return success(res, { user: safeUser });
});
