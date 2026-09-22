import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { success, error } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { createSaleSchema } from '../validators/sale.validator';

// Generate unique receipt number: RCP-YYYYMMDD-XXXX
async function generateReceiptNo(businessId: string): Promise<string> {
  const today = new Date();
  const ymd = today.toISOString().slice(0, 10).replace(/-/g, '');

  const count = await prisma.sale.count({
    where: {
      businessId,
      createdAt: {
        gte: new Date(today.setHours(0, 0, 0, 0)),
        lte: new Date(today.setHours(23, 59, 59, 999)),
      },
    },
  });

  const seq = String(count + 1).padStart(4, '0');
  return `RCP-${ymd}-${seq}`;
}

// POST /api/sales
export const createSale = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const userId = req.user!.userId;

  const parsed = createSaleSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 'Validation failed', 422, parsed.error.flatten().fieldErrors);
  }

   const {
    items,
    customerId,
    cartDiscount,
    paymentMethod,
    amountReceived,
    paymentReference,
    paymentPhone,
    notes,
    clientTransactionId,
  } = parsed.data;

  // 🔑 Idempotency: if this transaction was already processed, return it
  if (clientTransactionId) {
    const existing = await prisma.sale.findUnique({
      where: { clientTransactionId },
      include: {
        items: true,
        payments: true,
        customer: { select: { id: true, name: true, phone: true } },
        user: { select: { id: true, name: true } },
      },
    });
    if (existing) {
      return success(res, { sale: existing, alreadyProcessed: true }, 'Sale already processed');
    }
  }

  // === PRE-FLIGHT VALIDATION (outside transaction for speed) ===
  // Fetch all products in one query
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, businessId, deletedAt: null },
  });

  if (products.length !== items.length) {
    return error(res, 'One or more products not found', 404);
  }

  const productMap = new Map(products.map((p) => [p.id, p]));

  // Validate stock and compute totals
  let subtotal = 0;
  let itemDiscountTotal = 0;
  const saleItems: Array<{
    productId: string;
    productName: string;
    quantity: number;
    buyingPrice: number;
    sellingPrice: number;
    discount: number;
    subtotal: number;
  }> = [];

  for (const item of items) {
    const p = productMap.get(item.productId)!;

    if (p.stockQuantity < item.quantity) {
      return error(res, `Insufficient stock for "${p.name}". Available: ${p.stockQuantity}`, 400);
    }

    const lineSubtotal = p.sellingPrice * item.quantity;
    subtotal += lineSubtotal;
    itemDiscountTotal += item.discount;

    saleItems.push({
      productId: p.id,
      productName: p.name,
      quantity: item.quantity,
      buyingPrice: p.buyingPrice,
      sellingPrice: p.sellingPrice,
      discount: item.discount,
      subtotal: lineSubtotal - item.discount,
    });
  }

  const totalDiscount = itemDiscountTotal + cartDiscount;
  const taxable = Math.max(0, subtotal - totalDiscount);

  // Get tax settings
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return error(res, 'Business not found', 404);

  let tax = 0;
  let grandTotal = taxable;
  if (business.taxEnabled && business.taxRate > 0) {
    if (business.taxIncluded) {
      tax = (taxable * business.taxRate) / (100 + business.taxRate);
    } else {
      tax = (taxable * business.taxRate) / 100;
      grandTotal = taxable + tax;
    }
  }

  // Payment validation
  if (paymentMethod === 'CASH' && amountReceived < grandTotal) {
    return error(res, 'Amount received is less than total', 400);
  }

  const change = paymentMethod === 'CASH' ? amountReceived - grandTotal : 0;

  // Credit sales require a customer
  if (paymentMethod === 'CREDIT' && !customerId) {
    return error(res, 'Credit sales require a customer', 400);
  }

  // === EXECUTE TRANSACTION ===
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Re-fetch products inside transaction to lock rows (in case of concurrent sales)
      const freshProducts = await tx.product.findMany({
        where: { id: { in: productIds }, businessId },
      });
      const freshMap = new Map(freshProducts.map((p) => [p.id, p]));

      // 2. Re-validate stock
      for (const item of items) {
        const p = freshMap.get(item.productId)!;
        if (p.stockQuantity < item.quantity) {
          throw new Error(`Insufficient stock for "${p.name}"`);
        }
      }

      // 3. Generate receipt number
      const receiptNo = await generateReceiptNo(businessId);

      // 4. Create sale
      const sale = await tx.sale.create({
        data: {
          businessId,
          userId,
          customerId: customerId || null,
          receiptNo,
          clientTransactionId: clientTransactionId || null,
          subtotal,
          discount: totalDiscount,
          tax,
          grandTotal,
          status: 'COMPLETED',
          paymentMethod,
          amountReceived,
          change,
          notes: notes || null,
        },
      });

      // 5. Create sale items
      await tx.saleItem.createMany({
        data: saleItems.map((i) => ({ ...i, saleId: sale.id })),
      });

      // 6. Create payment record
      await tx.payment.create({
        data: {
          saleId: sale.id,
          method: paymentMethod,
          amount: grandTotal,
          reference: paymentReference || null,
          phoneNumber: paymentPhone || null,
          status: paymentMethod === 'CREDIT' ? 'PENDING' : 'SUCCESS',
        },
      });

      // 7. Deduct stock + create stock movements
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            businessId,
            productId: item.productId,
            userId,
            quantity: -item.quantity,
            movementType: 'SALE',
            reference: receiptNo,
            reason: `Sold via ${paymentMethod}`,
          },
        });
      }

      // 8. If credit sale, update customer balance
      if (paymentMethod === 'CREDIT' && customerId) {
        await tx.customer.update({
          where: { id: customerId },
          data: { outstandingBalance: { increment: grandTotal } },
        });
      }

      // 9. Fetch full sale for response
      const fullSale = await tx.sale.findUnique({
        where: { id: sale.id },
        include: {
          items: true,
          payments: true,
          customer: { select: { id: true, name: true, phone: true } },
          user: { select: { id: true, name: true } },
        },
      });

      return fullSale;
    });

    return success(res, { sale: result }, 'Sale completed successfully', 201);
  } catch (err: any) {
    console.error('Sale transaction failed:', err);
    return error(res, err.message || 'Sale could not be completed', 500);
  }
});

// GET /api/sales
export const listSales = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;

  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '50', 10)));
  const skip = (page - 1) * limit;
  const status = req.query.status as string | undefined;

  const where: any = { businessId };
  if (status) where.status = status;

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.sale.count({ where }),
  ]);

  return success(res, {
    sales,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// GET /api/sales/:id
export const getSale = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user!.businessId;
  const id = String(req.params.id);

  const sale = await prisma.sale.findFirst({
    where: { id, businessId },
    include: {
      items: true,
      payments: true,
      customer: true,
      user: { select: { id: true, name: true } },
    },
  });

  if (!sale) return error(res, 'Sale not found', 404);
  return success(res, { sale });
});
