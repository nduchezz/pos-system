import {
  api, resetDb, createBusiness, createAdmin, login, prisma,
} from './helpers';

describe('Security & Input Sanitization', () => {
  let businessId: string;
  let adminToken: string;

  beforeEach(async () => {
    await resetDb();
    const business = await createBusiness();
    businessId = business.id;
    const admin = await createAdmin(businessId);
    adminToken = await login(admin.email, admin.password);
  });

  describe('XSS / HTML injection', () => {
    it('strips HTML tags from product name', async () => {
      const res = await api
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '<script>alert(1)</script>Coca Cola',
          sku: `XSS-${Date.now()}`,
          buyingPrice: 10, sellingPrice: 20,
          stockQuantity: 5, minStock: 2, unit: 'PIECE',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.product.name).not.toContain('<script>');
      expect(res.body.data.product.name).toContain('Coca Cola');
    });

    it('strips HTML from category name', async () => {
      const res = await api
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '<img src=x onerror=alert(1)>Beverages' });

      expect(res.status).toBe(201);
      expect(res.body.data.category.name).not.toContain('<img');
      expect(res.body.data.category.name).toContain('Beverages');
    });

    it('strips HTML from business name on register', async () => {
      const res = await api.post('/api/auth/register').send({
        businessName: '<b>Evil</b> Shop',
        ownerName: 'Normal Owner',
        email: `xss-${Date.now()}@test.com`,
        password: 'password123',
        phone: '0712345678',
      });

      expect(res.status).toBe(201);
      const business = await prisma.business.findUnique({
        where: { id: res.body.data.business.id },
      });
      expect(business?.name).not.toContain('<b>');
      expect(business?.name).toContain('Evil');
    });
  });

  describe('Email normalization', () => {
    it('lowercases and trims email on register', async () => {
      const res = await api.post('/api/auth/register').send({
        businessName: 'Test Shop',
        ownerName: 'Test Owner',
        email: '  MIXED@Case.COM  ',
        password: 'password123',
        phone: '0712345678',
      });

      expect(res.status).toBe(201);
      expect(res.body.data.user.email).toBe('mixed@case.com');
    });
  });

  describe('SKU normalization', () => {
    it('uppercases SKU and trims spaces', async () => {
      const res = await api
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Product',
          sku: '  sku-test-1  ',
          buyingPrice: 10, sellingPrice: 20,
          stockQuantity: 5, minStock: 2, unit: 'PIECE',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.product.sku).toBe('SKU-TEST-1');
    });
  });

  describe('No info leaks in errors', () => {
    it('does not leak stack trace on 401', async () => {
      const res = await api.get('/api/auth/me');
      expect(res.body).not.toHaveProperty('stack');
      expect(res.body).not.toHaveProperty('trace');
    });

    it('does not leak schema info on validation errors', async () => {
      const res = await api.post('/api/auth/login').send({
        email: 'not-an-email',
        password: 'x',
      });
      expect(res.body.errors).toBeDefined();
      expect(JSON.stringify(res.body)).not.toContain('prisma');
      expect(JSON.stringify(res.body)).not.toContain('postgresql');
    });
  });

  describe('SQL injection attempts (safe via Prisma)', () => {
    it('handles SQL injection in search query safely', async () => {
      const res = await api
        .get("/api/products?search=' OR 1=1 --")
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(0);
    });

    it('handles SQL injection in login email safely', async () => {
      const res = await api.post('/api/auth/login').send({
        email: "admin' OR '1'='1",
        password: 'anything',
      });

      expect(res.status).toBe(422);
    });
  });
});
