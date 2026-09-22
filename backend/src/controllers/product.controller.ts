import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { success, error } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import {
  createProductSchema,
  updateProductSchema,
  adjustStockSchema,
  listProductsQuerySchema,
} from '../validators/product.validator';

// GET /api/products
export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;

  const parsed = listProductsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return error(res, 'Invalid query parameters', 422, parsed.error.flatten().fieldErrors);
  }

  const { search, categoryId, lowStock } = parsed.data;
  const page = Math.max(1, parseInt(parsed.data.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(parsed.data.limit || '50', 10)));
  const skip = (page - 1) * limit;

  const where: any = { businessId, deletedAt: null };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search } },
    ];
  }

  if (categoryId) where.categoryId = categoryId;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  // Filter low stock in memory if needed
  const filteredProducts = lowStock === 'true'
    ? products.filter((p) => p.stockQuantity <= p.minStock)
    : products;

  return success(res, {
    products: filteredProducts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// GET /api/products/:id
export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const id = String(req.params.id);

  const product = await prisma.product.findFirst({
    where: { id, businessId },
    include: {
      category: true,
      supplier: true,
    },
  });

  if (!product) return error(res, 'Product not found', 404);
  return success(res, { product });
});

// POST /api/products
export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const userId = req.user!.userId;

  const parsed = createProductSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
  }

  const data = parsed.data;

  // Check duplicate SKU
  const existing = await prisma.product.findFirst({
    where: { businessId, sku: data.sku, deletedAt: null },
  });
  if (existing) return error(res, 'A product with this SKU already exists', 409);

  // Validate category belongs to business
  if (data.categoryId) {
    const cat = await prisma.category.findFirst({
      where: { id: data.categoryId, businessId },
    });
    if (!cat) return error(res, 'Category not found', 404);
  }

  const product = await prisma.$transaction(async (tx) => {
    const p = await tx.product.create({
      data: {
        businessId,
        name: data.name,
        sku: data.sku,
        barcode: data.barcode || null,
        categoryId: data.categoryId || null,
        supplierId: data.supplierId || null,
        description: data.description || null,
        buyingPrice: data.buyingPrice,
        sellingPrice: data.sellingPrice,
        stockQuantity: data.stockQuantity,
        minStock: data.minStock,
        unit: data.unit,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    // If initial stock > 0, create a stock movement
    if (data.stockQuantity > 0) {
      await tx.stockMovement.create({
        data: {
          businessId,
          productId: p.id,
          userId,
          quantity: data.stockQuantity,
          movementType: 'PURCHASE',
          reason: 'Initial stock',
        },
      });
    }

    return p;
  });

  return success(res, { product }, 'Product created', 201);
});

// PUT /api/products/:id
export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const id = String(req.params.id);

  const parsed = updateProductSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
  }

  const existing = await prisma.product.findFirst({
    where: { id, businessId, deletedAt: null },
  });
  if (!existing) return error(res, 'Product not found', 404);

  const data = parsed.data;

  // Check SKU uniqueness if being changed
  if (data.sku && data.sku !== existing.sku) {
    const dup = await prisma.product.findFirst({
      where: { businessId, sku: data.sku, deletedAt: null, NOT: { id } },
    });
    if (dup) return error(res, 'A product with this SKU already exists', 409);
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      sku: data.sku,
      barcode: data.barcode === '' ? null : data.barcode,
      categoryId: data.categoryId === undefined ? undefined : data.categoryId,
      supplierId: data.supplierId === undefined ? undefined : data.supplierId,
      description: data.description === '' ? null : data.description,
      buyingPrice: data.buyingPrice,
      sellingPrice: data.sellingPrice,
      minStock: data.minStock,
      unit: data.unit,
      status: data.status,
    },
    include: {
      category: { select: { id: true, name: true } },
    },
  });

  return success(res, { product }, 'Product updated');
});

// DELETE /api/products/:id (soft delete)
export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const id = String(req.params.id);

  const existing = await prisma.product.findFirst({
    where: { id, businessId, deletedAt: null },
  });
  if (!existing) return error(res, 'Product not found', 404);

  await prisma.product.update({
    where: { id },
    data: { deletedAt: new Date(), status: false },
  });

  return success(res, null, 'Product deleted');
});

// PATCH /api/products/:id/stock
export const adjustStock = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const userId = req.user!.userId;
  const id = String(req.params.id);

  const parsed = adjustStockSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
  }

  const { quantity, movementType, reason } = parsed.data;

  const product = await prisma.product.findFirst({
    where: { id, businessId, deletedAt: null },
  });
  if (!product) return error(res, 'Product not found', 404);

  const newStock = product.stockQuantity + quantity;
  if (newStock < 0) return error(res, 'Insufficient stock for this adjustment', 400);

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({
      where: { id },
      data: { stockQuantity: newStock },
    });

    await tx.stockMovement.create({
      data: {
        businessId,
        productId: id,
        userId,
        quantity,
        movementType,
        reason: reason || `Stock ${quantity > 0 ? 'added' : 'removed'}`,
      },
    });

    return updated;
  });

  return success(res, { product: result }, 'Stock adjusted');
});

// GET /api/products/low-stock
export const lowStockProducts = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;

  const all = await prisma.product.findMany({
    where: { businessId, deletedAt: null, status: true },
    orderBy: { stockQuantity: 'asc' },
  });

  const products = all.filter((p) => p.stockQuantity <= p.minStock);

  return success(res, { products });
});
