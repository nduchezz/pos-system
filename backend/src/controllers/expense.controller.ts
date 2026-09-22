import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { success, error } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { createExpenseSchema, updateExpenseSchema } from '../validators/expense.validator';

// GET /api/expenses
export const listExpenses = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const { from, to, category } = req.query as Record<string, string | undefined>;

  const where: any = { businessId };
  if (category) where.category = category;
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: { user: { select: { id: true, name: true } } },
    orderBy: { date: 'desc' },
    take: 200,
  });

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return success(res, { expenses, total });
});

// GET /api/expenses/:id
export const getExpense = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const id = String(req.params.id);
  const expense = await prisma.expense.findFirst({
    where: { id, businessId },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!expense) return error(res, 'Expense not found', 404);
  return success(res, { expense });
});

// POST /api/expenses
export const createExpense = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const userId = req.user!.userId;

  const parsed = createExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
  }

  const d = parsed.data;
  const expense = await prisma.expense.create({
    data: {
      businessId,
      userId,
      category: d.category,
      amount: d.amount,
      description: d.description || null,
      paymentMethod: d.paymentMethod,
      date: d.date ? new Date(d.date) : new Date(),
    },
  });
  return success(res, { expense }, 'Expense recorded', 201);
});

// PUT /api/expenses/:id
export const updateExpense = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const id = String(req.params.id);

  const parsed = updateExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
  }

  const existing = await prisma.expense.findFirst({ where: { id, businessId } });
  if (!existing) return error(res, 'Expense not found', 404);

  const d = parsed.data;
  const expense = await prisma.expense.update({
    where: { id },
    data: {
      category: d.category,
      amount: d.amount,
      description: d.description === '' ? null : d.description,
      paymentMethod: d.paymentMethod,
      date: d.date ? new Date(d.date) : undefined,
    },
  });
  return success(res, { expense }, 'Expense updated');
});

// DELETE /api/expenses/:id
export const deleteExpense = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const id = String(req.params.id);
  const existing = await prisma.expense.findFirst({ where: { id, businessId } });
  if (!existing) return error(res, 'Expense not found', 404);
  await prisma.expense.delete({ where: { id } });
  return success(res, null, 'Expense deleted');
});
