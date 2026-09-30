import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import app from '../src/server';

export const prisma = new PrismaClient();
export const api = request(app);

export async function resetDb() {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "refund_items" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "refunds" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "payments" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "sale_items" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "sales" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "stock_movements" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "expenses" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "audit_logs" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "products" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "categories" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "suppliers" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "customers" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "settings" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "users" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "businesses" CASCADE');
}

let businessCounter = 0;
export async function createBusiness(overrides: any = {}) {
  businessCounter++;
  return prisma.business.create({
    data: {
      name: overrides.name || `Test Business ${businessCounter}`,
      ownerName: overrides.ownerName || 'Test Owner',
      phone: overrides.phone || '0712345678',
      email: overrides.email || `owner${businessCounter}-${Date.now()}@test.com`,
      currency: 'KES',
      taxRate: overrides.taxRate ?? 0,
      taxEnabled: overrides.taxEnabled ?? false,
      taxIncluded: overrides.taxIncluded ?? false,
    },
  });
}

export async function createAdmin(businessId: string, overrides: any = {}) {
  const email =
    overrides.email ||
    `admin-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
  const password = overrides.password || 'password123';
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      businessId,
      email,
      passwordHash,
      name: overrides.name || 'Admin User',
      role: 'ADMIN',
      phone: overrides.phone || '0712345678',
    },
  });

  return { user, password, email };
}

export async function createCashier(businessId: string, overrides: any = {}) {
  const email =
    overrides.email ||
    `cashier-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
  const password = overrides.password || 'password123';
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      businessId,
      email,
      passwordHash,
      name: overrides.name || 'Cashier User',
      role: 'CASHIER',
      phone: overrides.phone || '0712345678',
    },
  });

  return { user, password, email };
}

export async function login(email: string, password: string): Promise<string> {
  const res = await api.post('/api/auth/login').send({ email, password });
  return res.body?.data?.token;
}

export async function createCategory(businessId: string, overrides: any = {}) {
  return prisma.category.create({
    data: {
      businessId,
      name: overrides.name || `Category ${Date.now()}`,
      description: overrides.description || 'Test category',
    },
  });
}

export async function createProduct(businessId: string, overrides: any = {}) {
  const product = await prisma.product.create({
    data: {
      businessId,
      name: overrides.name || `Product ${Date.now()}`,
      sku:
        overrides.sku ||
        `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      barcode: overrides.barcode || null,
      categoryId: overrides.categoryId || null,
      buyingPrice: overrides.buyingPrice ?? 50,
      sellingPrice: overrides.sellingPrice ?? 80,
      stockQuantity: overrides.stockQuantity ?? 100,
      minStock: overrides.minStock ?? 5,
      unit: overrides.unit || 'PIECE',
      status: overrides.status ?? true,
    },
  });

  // Mirror the API behavior: initial stock creates a PURCHASE movement
  const stock = overrides.stockQuantity ?? 100;
  if (stock > 0 && overrides.skipMovement !== true) {
    // Need a user for the movement — use any admin in the business
    const user = await prisma.user.findFirst({
      where: { businessId, role: 'ADMIN' },
    });
    if (user) {
      await prisma.stockMovement.create({
        data: {
          businessId,
          productId: product.id,
          userId: user.id,
          quantity: stock,
          movementType: 'PURCHASE',
          reason: 'Initial stock',
        },
      });
    }
  }

  return product;
}

export async function createCustomer(businessId: string, overrides: any = {}) {
  return prisma.customer.create({
    data: {
      businessId,
      name: overrides.name || `Customer ${Date.now()}`,
      phone: overrides.phone || '0722000111',
      email: overrides.email || null,
      creditLimit: overrides.creditLimit ?? 0,
    },
  });
}
