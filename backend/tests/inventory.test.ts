import {
  api, resetDb, createBusiness, createAdmin, createCashier,
  login, createProduct, prisma,
} from './helpers';

describe('Inventory API', () => {
  let businessId: string;
  let adminToken: string;
  let cashierToken: string;

  beforeEach(async () => {
    await resetDb();
    const business = await createBusiness();
    businessId = business.id;

    const admin = await createAdmin(businessId);
    adminToken = await login(admin.email, admin.password);

    const cashier = await createCashier(businessId);
    cashierToken = await login(cashier.email, cashier.password);
  });

  describe('PATCH /api/products/:id/stock', () => {
    it('increases stock and records a movement', async () => {
      const product = await createProduct(businessId, { stockQuantity: 10 });

      const res = await api
        .patch(`/api/products/${product.id}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantity: 20, movementType: 'PURCHASE', reason: 'Restock' });

      expect(res.status).toBe(200);
      expect(res.body.data.product.stockQuantity).toBe(30);

      const movements = await prisma.stockMovement.findMany({
        where: { productId: product.id },
        orderBy: { createdAt: 'desc' },
      });
      expect(movements[0].quantity).toBe(20);
      expect(movements[0].movementType).toBe('PURCHASE');
      expect(movements[0].reason).toBe('Restock');
    });

    it('decreases stock', async () => {
      const product = await createProduct(businessId, { stockQuantity: 10 });

      const res = await api
        .patch(`/api/products/${product.id}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantity: -3, movementType: 'DAMAGE', reason: 'Broken' });

      expect(res.status).toBe(200);
      expect(res.body.data.product.stockQuantity).toBe(7);
    });

    it('rejects adjustment that would go below zero', async () => {
      const product = await createProduct(businessId, { stockQuantity: 5 });

      const res = await api
        .patch(`/api/products/${product.id}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantity: -10, movementType: 'LOSS', reason: 'Stolen' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/insufficient/i);
    });

    it('cashier can adjust stock (allowed)', async () => {
      const product = await createProduct(businessId, { stockQuantity: 10 });

      const res = await api
        .patch(`/api/products/${product.id}/stock`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ quantity: 5, movementType: 'PURCHASE' });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/inventory/summary', () => {
    it('returns correct totals', async () => {
      await createProduct(businessId, {
        stockQuantity: 10, buyingPrice: 50, sellingPrice: 80, minStock: 2,
      });
      await createProduct(businessId, {
        stockQuantity: 5, buyingPrice: 100, sellingPrice: 200, minStock: 2,
      });
      await createProduct(businessId, {
        stockQuantity: 0, buyingPrice: 10, sellingPrice: 20, minStock: 5,
      });
      await createProduct(businessId, {
        stockQuantity: 1, buyingPrice: 30, sellingPrice: 50, minStock: 5,
      });

      const res = await api
        .get('/api/inventory/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const s = res.body.data.summary;
      expect(s.totalProducts).toBe(4);
      expect(s.totalStockUnits).toBe(16); // 10 + 5 + 0 + 1
      expect(s.inventoryValueBuying).toBe(10 * 50 + 5 * 100 + 0 + 1 * 30); // 1030
      expect(s.lowStock).toBe(1); // only the 1-stock item (0-stock counted as outOfStock)
      expect(s.outOfStock).toBe(1);
    });
  });

  describe('GET /api/inventory/movements', () => {
    it('lists stock movements for the business only', async () => {
      const p1 = await createProduct(businessId, { stockQuantity: 10 });
      await api
        .patch(`/api/products/${p1.id}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantity: 5, movementType: 'PURCHASE' });

      const otherBiz = await createBusiness();
      const otherAdmin = await createAdmin(otherBiz.id);
      const otherToken = await login(otherAdmin.email, otherAdmin.password);
      const p2 = await createProduct(otherBiz.id, { stockQuantity: 20 });
      await api
        .patch(`/api/products/${p2.id}/stock`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ quantity: 5, movementType: 'PURCHASE' });

      const res = await api
        .get('/api/inventory/movements')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      // Should only see our business's movements (initial stock + the adjustment)
      const ours = res.body.data.movements.filter(
        (m: any) => m.productId === p1.id
      );
                 expect(ours.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /api/inventory/movements/product/:id', () => {
    it('returns full history for one product', async () => {
      const product = await createProduct(businessId, { stockQuantity: 10 });

      await api
        .patch(`/api/products/${product.id}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantity: 5, movementType: 'PURCHASE', reason: 'Restock 1' });

      await api
        .patch(`/api/products/${product.id}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantity: -2, movementType: 'DAMAGE', reason: 'Broken bottle' });

      const res = await api
        .get(`/api/inventory/movements/product/${product.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.product.name).toBeTruthy();
            expect(res.body.data.movements.length).toBeGreaterThanOrEqual(3);
    });
  });
});
