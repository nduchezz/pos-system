import {
  api, resetDb, createBusiness, createAdmin, createCashier,
  login, createProduct, prisma,
} from './helpers';

describe('Permissions & Role Access', () => {
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

  // ─────────────────────────────────────────────────────────────
  // CASHIER FORBIDDEN ACTIONS
  // ─────────────────────────────────────────────────────────────

  describe('Cashier is forbidden from admin-only actions', () => {
    it('cannot create products', async () => {
      const res = await api
        .post('/api/products')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          name: 'Test', sku: `SKU-${Date.now()}`,
          buyingPrice: 10, sellingPrice: 20,
          stockQuantity: 5, minStock: 2, unit: 'PIECE',
        });
      expect(res.status).toBe(403);
    });

    it('cannot update products', async () => {
      const product = await createProduct(businessId);
      const res = await api
        .put(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ sellingPrice: 999 });
      expect(res.status).toBe(403);
    });

    it('cannot delete products', async () => {
      const product = await createProduct(businessId);
      const res = await api
        .delete(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${cashierToken}`);
      expect(res.status).toBe(403);
    });

    it('cannot create categories', async () => {
      const res = await api
        .post('/api/categories')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ name: 'New Category' });
      expect(res.status).toBe(403);
    });

    it('cannot delete categories', async () => {
      const category = await prisma.category.create({
        data: { businessId, name: 'Test Cat' },
      });
      const res = await api
        .delete(`/api/categories/${category.id}`)
        .set('Authorization', `Bearer ${cashierToken}`);
      expect(res.status).toBe(403);
    });

    it('cannot list users', async () => {
      const res = await api
        .get('/api/users')
        .set('Authorization', `Bearer ${cashierToken}`);
      expect(res.status).toBe(403);
    });

    it('cannot create users', async () => {
      const res = await api
        .post('/api/users')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          name: 'New User', email: 'x@test.com',
          password: 'password123', role: 'CASHIER',
        });
      expect(res.status).toBe(403);
    });

    it('cannot update business settings', async () => {
      const res = await api
        .put('/api/business')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ name: 'Hacked Shop' });
      expect(res.status).toBe(403);
    });

    it('cannot access reports', async () => {
      const res = await api
        .get('/api/reports/sales')
        .set('Authorization', `Bearer ${cashierToken}`);
      expect(res.status).toBe(403);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // CASHIER ALLOWED ACTIONS
  // ─────────────────────────────────────────────────────────────

  describe('Cashier CAN perform', () => {
    it('can view products', async () => {
      await createProduct(businessId);
      const res = await api
        .get('/api/products')
        .set('Authorization', `Bearer ${cashierToken}`);
      expect(res.status).toBe(200);
    });

    it('can view categories', async () => {
      await prisma.category.create({ data: { businessId, name: 'Cat' } });
      const res = await api
        .get('/api/categories')
        .set('Authorization', `Bearer ${cashierToken}`);
      expect(res.status).toBe(200);
    });

    it('can create a sale', async () => {
      const product = await createProduct(businessId);
      const res = await api
        .post('/api/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          items: [{ productId: product.id, quantity: 1, discount: 0 }],
          cartDiscount: 0,
          paymentMethod: 'CASH',
          amountReceived: 100,
        });
      expect(res.status).toBe(201);
    });

    it('can view sales history', async () => {
      const res = await api
        .get('/api/sales')
        .set('Authorization', `Bearer ${cashierToken}`);
      expect(res.status).toBe(200);
    });

    it('can view dashboard', async () => {
      const res = await api
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${cashierToken}`);
      expect(res.status).toBe(200);
    });

    it('can adjust stock', async () => {
      const product = await createProduct(businessId, { stockQuantity: 10 });
      const res = await api
        .patch(`/api/products/${product.id}/stock`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ quantity: 5, movementType: 'PURCHASE' });
      expect(res.status).toBe(200);
    });

    it('can view customers', async () => {
      const res = await api
        .get('/api/customers')
        .set('Authorization', `Bearer ${cashierToken}`);
      expect(res.status).toBe(200);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // ADMIN ALLOWED ACTIONS
  // ─────────────────────────────────────────────────────────────

  describe('Admin CAN perform all actions', () => {
    it('can create product', async () => {
      const res = await api
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Admin Product', sku: `ADMIN-${Date.now()}`,
          buyingPrice: 10, sellingPrice: 20,
          stockQuantity: 5, minStock: 2, unit: 'PIECE',
        });
      expect(res.status).toBe(201);
    });

    it('can access reports', async () => {
      const res = await api
        .get('/api/reports/sales')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });

    it('can manage users', async () => {
      const res = await api
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });

    it('can update business settings', async () => {
      const res = await api
        .put('/api/business')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Shop' });
      expect(res.status).toBe(200);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // SELF-PROTECTION
  // ─────────────────────────────────────────────────────────────

  describe('Admin self-protection', () => {
    it('cannot delete their own account', async () => {
      const admin = await prisma.user.findFirst({
        where: { businessId, role: 'ADMIN' },
      });
      const res = await api
        .delete(`/api/users/${admin!.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/yourself/i);
    });

    it('cannot demote themselves', async () => {
      const admin = await prisma.user.findFirst({
        where: { businessId, role: 'ADMIN' },
      });
      const res = await api
        .put(`/api/users/${admin!.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'CASHIER' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/own role/i);
    });
  });
});
