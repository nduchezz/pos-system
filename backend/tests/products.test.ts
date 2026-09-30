import {
  api, resetDb, createBusiness, createAdmin, createCashier,
  login, createCategory, createProduct, prisma,
} from './helpers';

describe('Products API', () => {
  let businessId: string;
  let adminToken: string;
  let cashierToken: string;
  let categoryId: string;

  beforeEach(async () => {
    await resetDb();
    const business = await createBusiness();
    businessId = business.id;

    const admin = await createAdmin(businessId);
    adminToken = await login(admin.email, admin.password);

    const cashier = await createCashier(businessId);
    cashierToken = await login(cashier.email, cashier.password);

    const category = await createCategory(businessId);
    categoryId = category.id;
  });

  describe('POST /api/products', () => {
    it('creates a product with valid data (admin)', async () => {
      const res = await api
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Coca Cola 500ml',
          sku: 'COKE-500',
          barcode: '1234567890',
          categoryId,
          buyingPrice: 50,
          sellingPrice: 80,
          stockQuantity: 24,
          minStock: 5,
          unit: 'BOTTLE',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.product.name).toBe('Coca Cola 500ml');
      expect(res.body.data.product.stockQuantity).toBe(24);

      // Stock movement should have been auto-created
      const movements = await prisma.stockMovement.findMany({
        where: { productId: res.body.data.product.id },
      });
      expect(movements.length).toBe(1);
      expect(movements[0].movementType).toBe('PURCHASE');
      expect(movements[0].quantity).toBe(24);
    });

    it('rejects duplicate SKU', async () => {
      await createProduct(businessId, { sku: 'DUPE-SKU' });
      const res = await api
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Another Product',
          sku: 'DUPE-SKU',
          buyingPrice: 10,
          sellingPrice: 20,
          stockQuantity: 5,
          minStock: 2,
          unit: 'PIECE',
        });
      expect(res.status).toBe(409);
    });

    it('rejects negative selling price', async () => {
      const res = await api
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Bad Product',
          sku: `BAD-${Date.now()}`,
          buyingPrice: 10,
          sellingPrice: -50,
          stockQuantity: 5,
          minStock: 2,
          unit: 'PIECE',
        });
      expect(res.status).toBe(422);
    });

    it('rejects negative stock quantity', async () => {
      const res = await api
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Bad Product',
          sku: `BAD-${Date.now()}`,
          buyingPrice: 10,
          sellingPrice: 20,
          stockQuantity: -5,
          minStock: 2,
          unit: 'PIECE',
        });
      expect(res.status).toBe(422);
    });

    it('rejects unknown category', async () => {
      const res = await api
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Product',
          sku: `SKU-${Date.now()}`,
          categoryId: '00000000-0000-0000-0000-000000000000',
          buyingPrice: 10,
          sellingPrice: 20,
          stockQuantity: 5,
          minStock: 2,
          unit: 'PIECE',
        });
      expect(res.status).toBe(404);
    });

    it('rejects cashier creating product (403)', async () => {
      const res = await api
        .post('/api/products')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          name: 'Product',
          sku: `SKU-${Date.now()}`,
          buyingPrice: 10,
          sellingPrice: 20,
          stockQuantity: 5,
          minStock: 2,
          unit: 'PIECE',
        });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/products', () => {
    it('lists products for the business only', async () => {
      await createProduct(businessId, { name: 'Mine' });

      const otherBusiness = await createBusiness();
      await createProduct(otherBusiness.id, { name: 'Not Mine' });

      const res = await api
        .get('/api/products')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const names = res.body.data.products.map((p: any) => p.name);
      expect(names).toContain('Mine');
      expect(names).not.toContain('Not Mine');
    });

    it('searches by name', async () => {
      await createProduct(businessId, { name: 'Coca Cola 500ml' });
      await createProduct(businessId, { name: 'Fanta Orange 500ml' });

      const res = await api
        .get('/api/products?search=coca')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.body.data.products.length).toBe(1);
      expect(res.body.data.products[0].name).toBe('Coca Cola 500ml');
    });

    it('searches by SKU', async () => {
      await createProduct(businessId, { sku: 'COKE-500', name: 'Cola' });
      await createProduct(businessId, { sku: 'FANTA-500', name: 'Fanta' });

      const res = await api
        .get('/api/products?search=COKE')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.body.data.products.length).toBe(1);
    });
  });

  describe('GET /api/products/low-stock', () => {
    it('returns products below minStock only', async () => {
      await createProduct(businessId, { name: 'Plenty', stockQuantity: 100, minStock: 5 });
      await createProduct(businessId, { name: 'Low', stockQuantity: 2, minStock: 5 });
      await createProduct(businessId, { name: 'Exactly', stockQuantity: 5, minStock: 5 });

      const res = await api
        .get('/api/products/low-stock')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const names = res.body.data.products.map((p: any) => p.name);
      expect(names).toContain('Low');
      expect(names).toContain('Exactly');
      expect(names).not.toContain('Plenty');
    });
  });

  describe('PUT /api/products/:id', () => {
    it('updates product', async () => {
      const product = await createProduct(businessId);

      const res = await api
        .put(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sellingPrice: 150 });

      expect(res.status).toBe(200);
      expect(res.body.data.product.sellingPrice).toBe(150);
    });

    it('rejects cashier updating product', async () => {
      const product = await createProduct(businessId);

      const res = await api
        .put(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ sellingPrice: 150 });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('soft-deletes product (admin)', async () => {
      const product = await createProduct(businessId);

      const res = await api
        .delete(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      // Verify soft delete
      const fresh = await prisma.product.findUnique({ where: { id: product.id } });
      expect(fresh?.deletedAt).not.toBeNull();
      expect(fresh?.status).toBe(false);

      // Verify it no longer shows in list
      const listRes = await api
        .get('/api/products')
        .set('Authorization', `Bearer ${adminToken}`);
      const ids = listRes.body.data.products.map((p: any) => p.id);
      expect(ids).not.toContain(product.id);
    });
  });
});
