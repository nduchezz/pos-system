import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { success, error } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

// GET /api/stock-movements
export const listMovements = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;

  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '50', 10)));
  const skip = (page - 1) * limit;

  const { productId, movementType, from, to } = req.query as Record<string, string | undefined>;

  const where: any = { businessId };
  if (productId) where.productId = productId;
  if (movementType) where.movementType = movementType;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true, unit: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return success(res, {
    movements,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// GET /api/stock-movements/product/:productId
export const productHistory = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const productId = String(req.params.productId);

  const product = await prisma.product.findFirst({
    where: { id: productId, businessId },
    select: { id: true, name: true, sku: true, stockQuantity: true, minStock: true, unit: true },
  });
  if (!product) return error(res, 'Product not found', 404);

  const movements = await prisma.stockMovement.findMany({
    where: { businessId, productId },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return success(res, { product, movements });
});

// GET /api/inventory/summary
export const inventorySummary = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;

  const products = await prisma.product.findMany({
    where: { businessId, deletedAt: null, status: true },
    select: {
      id: true,
      stockQuantity: true,
      minStock: true,
      buyingPrice: true,
      sellingPrice: true,
    },
  });

  let totalProducts = products.length;
  let totalStockUnits = 0;
  let inventoryValueBuying = 0;
  let inventoryValueSelling = 0;
  let lowStock = 0;
  let outOfStock = 0;

  for (const p of products) {
    totalStockUnits += p.stockQuantity;
    inventoryValueBuying += p.stockQuantity * p.buyingPrice;
    inventoryValueSelling += p.stockQuantity * p.sellingPrice;
    if (p.stockQuantity <= 0) outOfStock++;
    else if (p.stockQuantity <= p.minStock) lowStock++;
  }

  return success(res, {
    summary: {
      totalProducts,
      totalStockUnits,
      inventoryValueBuying,
      inventoryValueSelling,
      potentialProfit: inventoryValueSelling - inventoryValueBuying,
      lowStock,
      outOfStock,
      inStock: totalProducts - lowStock - outOfStock,
    },
  });
});
