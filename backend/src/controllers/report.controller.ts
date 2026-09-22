import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { success } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

function parseDate(s: string | undefined, fallback: Date): Date {
  return s ? new Date(s) : fallback;
}

function getRange(req: Request) {
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 30);

  const from = parseDate(req.query.from as string | undefined, defaultFrom);
  const to = parseDate(req.query.to as string | undefined, new Date());
  to.setHours(23, 59, 59, 999);

  return { from, to };
}

// GET /api/reports/sales
export const salesReport = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const { from, to } = getRange(req);

  const sales = await prisma.sale.findMany({
    where: { businessId, status: 'COMPLETED', createdAt: { gte: from, lte: to } },
    include: { items: true, payments: true },
    orderBy: { createdAt: 'asc' },
  });

  let revenue = 0, cogs = 0, itemsSold = 0, discounts = 0, tax = 0;
  const byPayment: Record<string, { count: number; amount: number }> = {};
  const byDay = new Map<string, { date: string; revenue: number; count: number }>();

  for (const sale of sales) {
    revenue += sale.grandTotal;
    discounts += sale.discount;
    tax += sale.tax;

    const pay = (byPayment[sale.paymentMethod] ||= { count: 0, amount: 0 });
    pay.count += 1;
    pay.amount += sale.grandTotal;

    for (const item of sale.items) {
      itemsSold += item.quantity;
      cogs += item.buyingPrice * item.quantity;
    }

    const dayKey = sale.createdAt.toISOString().slice(0, 10);
    const day = byDay.get(dayKey) || { date: dayKey, revenue: 0, count: 0 };
    day.revenue += sale.grandTotal;
    day.count += 1;
    byDay.set(dayKey, day);
  }

  // Expenses
  const expenseAgg = await prisma.expense.aggregate({
    where: { businessId, date: { gte: from, lte: to } },
    _sum: { amount: true },
  });
  const expenses = expenseAgg._sum.amount || 0;

  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - expenses;

  return success(res, {
    period: { from, to },
    summary: {
      totalSales: sales.length,
      revenue,
      cogs,
      grossProfit,
      expenses,
      netProfit,
      discounts,
      tax,
      itemsSold,
      avgSaleValue: sales.length > 0 ? revenue / sales.length : 0,
    },
    byPaymentMethod: byPayment,
    daily: Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date)),
  });
});

// GET /api/reports/products
export const productsReport = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const { from, to } = getRange(req);
  const limit = Math.min(50, parseInt((req.query.limit as string) || '20', 10));

  const saleItems = await prisma.saleItem.findMany({
    where: {
      sale: { businessId, status: 'COMPLETED', createdAt: { gte: from, lte: to } },
    },
    include: { product: { select: { id: true, name: true, sku: true } } },
  });

  const map = new Map<string, {
    productId: string; productName: string; sku: string;
    quantitySold: number; revenue: number; cogs: number; profit: number;
  }>();

  for (const item of saleItems) {
    const key = item.productId;
    const existing = map.get(key) || {
      productId: key,
      productName: item.productName,
      sku: item.product?.sku || '',
      quantitySold: 0, revenue: 0, cogs: 0, profit: 0,
    };
    existing.quantitySold += item.quantity;
    existing.revenue += item.subtotal;
    existing.cogs += item.buyingPrice * item.quantity;
    existing.profit = existing.revenue - existing.cogs;
    map.set(key, existing);
  }

  const all = Array.from(map.values());

  return success(res, {
    period: { from, to },
    bestSelling: [...all].sort((a, b) => b.quantitySold - a.quantitySold).slice(0, limit),
    mostProfitable: [...all].sort((a, b) => b.profit - a.profit).slice(0, limit),
    slowMoving: [...all].sort((a, b) => a.quantitySold - b.quantitySold).slice(0, limit),
  });
});

// GET /api/reports/inventory
export const inventoryReport = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;

  const products = await prisma.product.findMany({
    where: { businessId, deletedAt: null, status: true },
    include: { category: { select: { name: true } } },
    orderBy: { stockQuantity: 'asc' },
  });

  let totalBuying = 0, totalSelling = 0, lowStock = 0, outOfStock = 0;

  const list = products.map((p) => {
    const buyingValue = p.stockQuantity * p.buyingPrice;
    const sellingValue = p.stockQuantity * p.sellingPrice;
    totalBuying += buyingValue;
    totalSelling += sellingValue;
    if (p.stockQuantity <= 0) outOfStock++;
    else if (p.stockQuantity <= p.minStock) lowStock++;

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category?.name || null,
      stockQuantity: p.stockQuantity,
      minStock: p.minStock,
      unit: p.unit,
      buyingPrice: p.buyingPrice,
      sellingPrice: p.sellingPrice,
      buyingValue,
      sellingValue,
      status:
        p.stockQuantity <= 0 ? 'OUT' :
        p.stockQuantity <= p.minStock ? 'LOW' : 'OK',
    };
  });

  return success(res, {
    summary: {
      totalProducts: products.length,
      totalBuyingValue: totalBuying,
      totalSellingValue: totalSelling,
      potentialProfit: totalSelling - totalBuying,
      lowStock,
      outOfStock,
    },
    products: list,
  });
});
