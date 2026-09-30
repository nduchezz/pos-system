import {
  api, resetDb, createBusiness, createAdmin, createCashier,
  login, createProduct, prisma,
} from './helpers';

describe('Audit Logging', () => {
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

  it('logs LOGIN_SUCCESS on valid login', async () => {
    const logs = await prisma.auditLog.findMany({
      where: { businessId, action: 'LOGIN_SUCCESS' },
    });
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].entity).toBe('User');
  });

  it('logs LOGIN_FAILED on wrong password', async () => {
    const admin = await prisma.user.findFirst({
      where: { businessId, role: 'ADMIN' },
    });

    await api.post('/api/auth/login').send({
      email: admin!.email,
      password: 'definitely-wrong',
    });

    const logs = await prisma.auditLog.findMany({
      where: { businessId, action: 'LOGIN_FAILED', userId: admin!.id },
    });
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].newValue).toContain('wrong_password');
  });

  it('logs PRODUCT_CREATED when admin creates product', async () => {
    const res = await api
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Audit Test Product',
        sku: `AUDIT-${Date.now()}`,
        buyingPrice: 10,
        sellingPrice: 20,
        stockQuantity: 5,
        minStock: 2,
        unit: 'PIECE',
      });

    expect(res.status).toBe(201);

    const logs = await prisma.auditLog.findMany({
      where: { businessId, action: 'PRODUCT_CREATED' },
    });
    expect(logs.length).toBe(1);
    expect(logs[0].entityId).toBe(res.body.data.product.id);
    expect(logs[0].newValue).toContain('Audit Test Product');
  });

  it('logs PRICE_CHANGED when selling price changes', async () => {
    const product = await createProduct(businessId, { sellingPrice: 100 });

    await api
      .put(`/api/products/${product.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sellingPrice: 150 });

    const logs = await prisma.auditLog.findMany({
      where: { businessId, action: 'PRICE_CHANGED' },
    });
    expect(logs.length).toBe(1);
    expect(logs[0].oldValue).toContain('100');
    expect(logs[0].newValue).toContain('150');
  });

  it('logs PRODUCT_UPDATED when only name changes', async () => {
    const product = await createProduct(businessId);

    await api
      .put(`/api/products/${product.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Renamed Product' });

    const priceLogs = await prisma.auditLog.count({
      where: { businessId, action: 'PRICE_CHANGED' },
    });
    const updateLogs = await prisma.auditLog.count({
      where: { businessId, action: 'PRODUCT_UPDATED' },
    });
    expect(priceLogs).toBe(0);
    expect(updateLogs).toBeGreaterThanOrEqual(1);
  });

  it('logs SALE_CREATED when cashier makes a sale', async () => {
    const product = await createProduct(businessId, { stockQuantity: 10 });

    const res = await api
      .post('/api/sales')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        items: [{ productId: product.id, quantity: 2, discount: 0 }],
        cartDiscount: 0,
        paymentMethod: 'CASH',
        amountReceived: 200,
      });

    expect(res.status).toBe(201);

    const logs = await prisma.auditLog.findMany({
      where: { businessId, action: 'SALE_CREATED' },
    });
    expect(logs.length).toBe(1);
    expect(logs[0].entityId).toBe(res.body.data.sale.id);
    expect(logs[0].newValue).toContain(res.body.data.sale.receiptNo);
  });

  it('logs PRODUCT_DELETED with old name preserved', async () => {
    const product = await createProduct(businessId, { name: 'To Be Deleted' });

    await api
      .delete(`/api/products/${product.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const logs = await prisma.auditLog.findMany({
      where: { businessId, action: 'PRODUCT_DELETED' },
    });
    expect(logs.length).toBe(1);
    expect(logs[0].oldValue).toContain('To Be Deleted');
  });
});
