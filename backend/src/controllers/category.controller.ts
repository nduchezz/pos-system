import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { success, error } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { createCategorySchema, updateCategorySchema } from '../validators/category.validator';

// GET /api/categories
export const listCategories = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;

  const categories = await prisma.category.findMany({
    where: { businessId },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { products: true } },
    },
  });

  return success(res, { categories });
});

// GET /api/categories/:id
export const getCategory = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const id = String(req.params.id);

  const category = await prisma.category.findFirst({
    where: { id, businessId },
    include: { products: { take: 10 } },
  });

  if (!category) return error(res, 'Category not found', 404);
  return success(res, { category });
});

// POST /api/categories
export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;

  const parsed = createCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
  }

  // Check duplicate name in this business
  const existing = await prisma.category.findFirst({
    where: { businessId, name: parsed.data.name },
  });
  if (existing) {
    return error(res, 'A category with this name already exists', 409);
  }

  const category = await prisma.category.create({
    data: {
      businessId,
      name: parsed.data.name,
      description: parsed.data.description,
    },
  });

  return success(res, { category }, 'Category created', 201);
});

// PUT /api/categories/:id
export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const id = String(req.params.id);

  const parsed = updateCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
  }

  const existing = await prisma.category.findFirst({ where: { id, businessId } });
  if (!existing) return error(res, 'Category not found', 404);

  // If renaming, check duplicate
  if (parsed.data.name && parsed.data.name !== existing.name) {
    const dup = await prisma.category.findFirst({
      where: { businessId, name: parsed.data.name, NOT: { id } },
    });
    if (dup) return error(res, 'A category with this name already exists', 409);
  }

  const category = await prisma.category.update({
    where: { id },
    data: parsed.data,
  });

  return success(res, { category }, 'Category updated');
});

// DELETE /api/categories/:id
export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const id = String(req.params.id);

  const existing = await prisma.category.findFirst({
    where: { id, businessId },
  });
  if (!existing) return error(res, 'Category not found', 404);

  // Count products using this category
  const productCount = await prisma.product.count({ where: { categoryId: id } });
  if (productCount > 0) {
    return error(
      res,
      `Cannot delete: ${productCount} product(s) use this category. Reassign them first.`,
      400
    );
  }

  await prisma.category.delete({ where: { id } });

  return success(res, null, 'Category deleted');
});
