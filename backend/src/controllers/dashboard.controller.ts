import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { success } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function startOfWeek(d = new Date()) { const x = startOfDay(d); const day = x.getDay(); x.setDate(x.getDate() - day); return x; }
function startOfMonth(d = new Date()) { const x = new Date(d.getFullYear(), d.getMonth(), 1); return x; }

// GET /api/dashboard
export const dashboard = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;

  const todayStart = startOfDay();
  const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1);

  // Today's sales
  const todaysSales = await prisma.sale.findMany({
    where: {
      businessId,
      status: 'COMPLETED',
      createdAt: { gte: todayStart, lt: todayEnd },
    },
    include: { items: true, payments: true },
  });

  const todayStats = {
    totalSales: todaysSales.length,
    grossRevenue: 0,
    totalItemsSold: 0,
    cogs: 0,
    grossProfit: 0,
    byPaymentMethod: { CASH: 0, MPESA: 0, CARD: 0, BANK: 0, CREDIT: 0 } as Record<string, number>,
  };

  for (const sale of todaysSales) {
    todayStats.grossRevenue += sale.grandTotal;
    for (const item of sale.items) {
      todayStats.totalItemsSold += item.quantity;
      todayStats.cogs += item.buyingPrice * item.quantity;
    }
    todayStats.byPaymentMethod[sale.paymentMethod] =
      (todayStats.byPaymentMethod[sale.paymentMethod] || 0) + sale.grandTotal;
  }
  todayStats.grossProfit = todayStats.grossRevenue - todayStats.cogs;

  // Today's expenses
  const todayExpenses = await prisma.expense.aggregate({
    where: { businessId, date: { gte: todayStart, lt: todayEnd } },
    _sum: { amount: true },
  });
  const todayExpensesTotal = todayExpenses._sum.amount || 0;

  // Inventory stats
  const products = await prisma.product.findMany({
    where: { businessId, deletedAt: null, status: true },
    select: { stockQuantity: true, minStock: true, buyingPrice: true },
  });
  let lowStock = 0, outOfStock = 0, inventoryValue = 0;
  for (const p of products) {
    inventoryValue += p.stockQuantity * p.buyingPrice;
    if (p.stockQuantity <= 0) outOfStock++;
    else if (p.stockQuantity <= p.minStock) lowStock++;
  }

  return success(res, {
    today: {
      ...todayStats,
      expenses: todayExpensesTotal,
      netProfit: todayStats.grossProfit - todayExpensesTotal,
    },
    inventory: {
      totalProducts: products.length,
      lowStock,
      outOfStock,
      inventoryValue,
    },
  });
});

// GET /api/dashboard/chart?period=today|week|month
export const dashboardChart = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const period = (req.query.period as string) || 'week';

  let from: Date;
  let trunc: string;
  let steps: number;

  const now = new Date();
  if (period === 'today') {
    from = startOfDay();
    trunc = 'hour';
    steps = 24;
  } else if (period === 'month') {
    from = startOfMonth();
    trunc = 'day';
    steps = 31;
  } else {
    from = startOfWeek();
    trunc = 'day';
    steps = 7;
  }

  // Get all sales in range and group in JS (simpler and works across timezones)
  const sales = await prisma.sale.findMany({
    where: { businessId, status: 'COMPLETED', createdAt: { gte: from } },
    select: { createdAt: true, grandTotal: true },
    orderBy: { createdAt: 'asc' },
  });

  const buckets: { label: string; value: number; sortKey: string }[] = [];
  const bucketMap = new Map<string, number>();

  for (let i = 0; i < steps; i++) {
    const d = new Date(from);
    if (period === 'today') {
      d.setHours(d.getHours() + i);
      buckets.push({ label: `${d.getHours()}:00`, value: 0, sortKey: d.toISOString() });
    } else {
      d.setDate(d.getDate() + i);
      const label = d.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric' });
      buckets.push({ label, value: 0, sortKey: d.toISOString().slice(0, 10) });
    }
  }

  for (const s of sales) {
    const d = new Date(s.createdAt);
    let key: string;
    if (period === 'today') {
      key = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).toISOString();
    } else {
      key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
    }
    bucketMap.set(key, (bucketMap.get(key) || 0) + s.grandTotal);
  }

  for (const b of buckets) {
    const key = period === 'today'
      ? new Date(b.sortKey).toISOString()
      : b.sortKey;
    b.value = bucketMap.get(key) || 0;
  }

  return success(res, { period, data: buckets });
});
