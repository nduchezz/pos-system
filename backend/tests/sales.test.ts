import {
  api, resetDb, createBusiness, createAdmin, createCashier,
  login, createProduct, createCustomer, prisma,
} from './helpers';

describe('Sales API', () => {
  let businessId: string;
  let adminToken: string;
  let cashierToken: string;

  beforeEach(async () => {
    await resetDb();
    const business = await createBusiness({ taxEnabled: false, taxRate: 0 });
    businessId = business.id;

    const admin = await createAdmin(businessId);
    adminToken = await login(admin.email, admin.password);

    const cashier = await createCashier(businessId);
    cashierToken = await login(cashier.email, cashier.password);
  });

  // ─────────────────────────────────────────────────────────────
  // HAPPY PATH
  // ─────────────────────────────────────────────────────────────

  describe('POST /api/sales — happy path', () => {
    it('creates a sale, deducts stock, records movement + payment', async () => {
      const product = await createProduct(businessId, {
        sellingPrice: 80, buyingPrice: 50, stockQuantity: 24,
      });

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
      expect(res.body.success).toBe(true);

      const sale = res.body.data.sale;
      expect(sale.receiptNo).toMatch(/^RCP-\d{8}-\d{4}$/);
      expect(sale.subtotal).toBe(160);
      expect(sale.grandTotal).toBe(160);
      expect(sale.amountReceived).toBe(200);
      expect(sale.change).toBe(40);
      expect(sale.status).toBe('COMPLETED');
      expect(sale.items.length).toBe(1);
      expect(sale.payments.length).toBe(1);
      expect(sale.payments[0].method).toBe('CASH');

      // Verify stock deducted
      const fresh = await prisma.product.findUnique({ where: { id: product.id } });
      expect(fresh?.stockQuantity).toBe(22); // 24 - 2

      // Verify stock movement recorded
      const movements = await prisma.stockMovement.findMany({
        where: { productId: product.id, movementType: 'SALE' },
      });
      expect(movements.length).toBe(1);
      expect(movements[0].quantity).toBe(-2);
      expect(movements[0].reference).toBe(sale.receiptNo);
    });

    it('cashier can create a sale (allowed)', async () => {
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

    it('supports M-Pesa with reference + phone', async () => {
      const product = await createProduct(businessId, { sellingPrice: 100 });
      const res = await api
        .post('/api/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          items: [{ productId: product.id, quantity: 1, discount: 0 }],
          cartDiscount: 0,
          paymentMethod: 'MPESA',
          amountReceived: 100,
          paymentPhone: '0722334455',
          paymentReference: 'QDC12XYZ89',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.sale.payments[0].method).toBe('MPESA');
      expect(res.body.data.sale.payments[0].reference).toBe('QDC12XYZ89');
      expect(res.body.data.sale.payments[0].phoneNumber).toBe('0722334455');
    });

    it('supports credit sale with customer', async () => {
      const product = await createProduct(businessId, { sellingPrice: 500 });
      const customer = await createCustomer(businessId, { creditLimit: 5000 });

      const res = await api
        .post('/api/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          items: [{ productId: product.id, quantity: 1, discount: 0 }],
          cartDiscount: 0,
          paymentMethod: 'CREDIT',
          amountReceived: 500,
          customerId: customer.id,
        });

      expect(res.status).toBe(201);

      // Verify customer balance increased
      const fresh = await prisma.customer.findUnique({ where: { id: customer.id } });
      expect(fresh?.outstandingBalance).toBe(500);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────────────────────────

  describe('POST /api/sales — validation', () => {
    it('rejects empty cart', async () => {
      const res = await api
        .post('/api/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          items: [],
          cartDiscount: 0,
          paymentMethod: 'CASH',
          amountReceived: 100,
        });
      expect(res.status).toBe(422);
    });

    it('rejects unknown product', async () => {
      const res = await api
        .post('/api/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          items: [{
            productId: '00000000-0000-0000-0000-000000000000',
            quantity: 1, discount: 0,
          }],
          cartDiscount: 0,
          paymentMethod: 'CASH',
          amountReceived: 100,
        });
      expect(res.status).toBe(404);
    });

    it('rejects insufficient stock', async () => {
      const product = await createProduct(businessId, { stockQuantity: 3 });

      const res = await api
        .post('/api/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          items: [{ productId: product.id, quantity: 10, discount: 0 }],
          cartDiscount: 0,
          paymentMethod: 'CASH',
          amountReceived: 1000,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/insufficient/i);

      // Verify stock untouched
      const fresh = await prisma.product.findUnique({ where: { id: product.id } });
      expect(fresh?.stockQuantity).toBe(3);
    });

    it('rejects cash payment below total', async () => {
      const product = await createProduct(businessId, { sellingPrice: 500 });

      const res = await api
        .post('/api/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          items: [{ productId: product.id, quantity: 1, discount: 0 }],
          cartDiscount: 0,
          paymentMethod: 'CASH',
          amountReceived: 100,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/less than/i);
    });

    it('rejects credit sale without customer', async () => {
      const product = await createProduct(businessId);

      const res = await api
        .post('/api/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          items: [{ productId: product.id, quantity: 1, discount: 0 }],
          cartDiscount: 0,
          paymentMethod: 'CREDIT',
          amountReceived: 100,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/customer/i);
    });

    it('rejects negative quantity', async () => {
      const product = await createProduct(businessId);
      const res = await api
        .post('/api/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          items: [{ productId: product.id, quantity: -1, discount: 0 }],
          cartDiscount: 0,
          paymentMethod: 'CASH',
          amountReceived: 100,
        });
      expect(res.status).toBe(422);
    });

    it('rejects request without token', async () => {
      const res = await api.post('/api/sales').send({
        items: [], paymentMethod: 'CASH', amountReceived: 0, cartDiscount: 0,
      });
      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // CALCULATIONS
  // ─────────────────────────────────────────────────────────────

  describe('POST /api/sales — calculations', () => {
    it('calculates subtotal correctly for multiple items', async () => {
      const p1 = await createProduct(businessId, { sellingPrice: 80 });
      const p2 = await createProduct(businessId, { sellingPrice: 150 });

      const res = await api
        .post('/api/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          items: [
            { productId: p1.id, quantity: 2, discount: 0 },
            { productId: p2.id, quantity: 1, discount: 0 },
          ],
          cartDiscount: 0,
          paymentMethod: 'CASH',
          amountReceived: 500,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.sale.subtotal).toBe(310); // 2*80 + 1*150
      expect(res.body.data.sale.grandTotal).toBe(310);
    });

    it('applies item-level discount', async () => {
      const product = await createProduct(businessId, { sellingPrice: 500 });

      const res = await api
        .post('/api/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          items: [{ productId: product.id, quantity: 1, discount: 50 }],
          cartDiscount: 0,
          paymentMethod: 'CASH',
          amountReceived: 500,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.sale.discount).toBe(50);
      expect(res.body.data.sale.grandTotal).toBe(450);
    });

    it('applies cart-level discount', async () => {
      const product = await createProduct(businessId, { sellingPrice: 500 });

      const res = await api
        .post('/api/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          items: [{ productId: product.id, quantity: 1, discount: 0 }],
          cartDiscount: 100,
          paymentMethod: 'CASH',
          amountReceived: 500,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.sale.discount).toBe(100);
      expect(res.body.data.sale.grandTotal).toBe(400);
    });

    it('adds tax when enabled (taxExcluded)', async () => {
      const newBiz = await createBusiness({ taxEnabled: true, taxRate: 16, taxIncluded: false });
      const newAdmin = await createAdmin(newBiz.id);
      const newToken = await login(newAdmin.email, newAdmin.password);
      const product = await createProduct(newBiz.id, { sellingPrice: 100 });

      const res = await api
        .post('/api/sales')
        .set('Authorization', `Bearer ${newToken}`)
        .send({
          items: [{ productId: product.id, quantity: 1, discount: 0 }],
          cartDiscount: 0,
          paymentMethod: 'CASH',
          amountReceived: 200,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.sale.subtotal).toBe(100);
      expect(res.body.data.sale.tax).toBe(16); // 16% of 100
      expect(res.body.data.sale.grandTotal).toBe(116);
    });

    it('extracts tax when included in price', async () => {
      const newBiz = await createBusiness({ taxEnabled: true, taxRate: 16, taxIncluded: true });
      const newAdmin = await createAdmin(newBiz.id);
      const newToken = await login(newAdmin.email, newAdmin.password);
      const product = await createProduct(newBiz.id, { sellingPrice: 116 });

      const res = await api
        .post('/api/sales')
        .set('Authorization', `Bearer ${newToken}`)
        .send({
          items: [{ productId: product.id, quantity: 1, discount: 0 }],
          cartDiscount: 0,
          paymentMethod: 'CASH',
          amountReceived: 200,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.sale.grandTotal).toBe(116); // total unchanged
      // Tax = 116 * 16 / 116 = 16
      expect(res.body.data.sale.tax).toBeCloseTo(16, 2);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // IDEMPOTENCY
  // ─────────────────────────────────────────────────────────────

  describe('POST /api/sales — idempotency', () => {
    it('returns the same sale when clientTransactionId is reused', async () => {
      const product = await createProduct(businessId, { stockQuantity: 100 });
      const clientTxId = '00000000-0000-4000-8000-000000000001';

      const payload = {
        items: [{ productId: product.id, quantity: 1, discount: 0 }],
        cartDiscount: 0,
        paymentMethod: 'CASH',
        amountReceived: 100,
        clientTransactionId: clientTxId,
      };

      const first = await api
        .post('/api/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send(payload);
      const second = await api
        .post('/api/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send(payload);

      expect(first.status).toBe(201);
      expect(second.status).toBe(200);
      expect(second.body.data.alreadyProcessed).toBe(true);
      expect(first.body.data.sale.receiptNo).toBe(second.body.data.sale.receiptNo);

      // Stock deducted only ONCE
      const fresh = await prisma.product.findUnique({ where: { id: product.id } });
      expect(fresh?.stockQuantity).toBe(99);

      // Only one sale in DB
      const sales = await prisma.sale.findMany({ where: { businessId } });
      expect(sales.length).toBe(1);
    });

    it('creates separate sales for different clientTransactionIds', async () => {
      const product = await createProduct(businessId, { stockQuantity: 100 });

      await api
        .post('/api/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          items: [{ productId: product.id, quantity: 1, discount: 0 }],
          cartDiscount: 0,
          paymentMethod: 'CASH',
          amountReceived: 100,
          clientTransactionId: '00000000-0000-4000-8000-000000000002',
        });

      await api
        .post('/api/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          items: [{ productId: product.id, quantity: 1, discount: 0 }],
          cartDiscount: 0,
          paymentMethod: 'CASH',
          amountReceived: 100,
          clientTransactionId: '00000000-0000-4000-8000-000000000003',
        });

      const fresh = await prisma.product.findUnique({ where: { id: product.id } });
      expect(fresh?.stockQuantity).toBe(98); // two deductions
    });
  });

  // ─────────────────────────────────────────────────────────────
  // MULTI-TENANCY
  // ─────────────────────────────────────────────────────────────

  describe('Cross-business isolation', () => {
    it('cannot sell a product from another business', async () => {
      const otherBiz = await createBusiness();
      const otherProduct = await createProduct(otherBiz.id);

      const res = await api
        .post('/api/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          items: [{ productId: otherProduct.id, quantity: 1, discount: 0 }],
          cartDiscount: 0,
          paymentMethod: 'CASH',
          amountReceived: 100,
        });

      expect(res.status).toBe(404);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // LIST + GET
  // ─────────────────────────────────────────────────────────────

  describe('GET /api/sales', () => {
    it('lists only sales for the current business', async () => {
      const product = await createProduct(businessId);

      await api
        .post('/api/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          items: [{ productId: product.id, quantity: 1, discount: 0 }],
          cartDiscount: 0,
          paymentMethod: 'CASH',
          amountReceived: 100,
        });

      const otherBiz = await createBusiness();
      const otherAdmin = await createAdmin(otherBiz.id);
      const otherToken = await login(otherAdmin.email, otherAdmin.password);
      const otherProduct = await createProduct(otherBiz.id);

      await api
        .post('/api/sales')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          items: [{ productId: otherProduct.id, quantity: 1, discount: 0 }],
          cartDiscount: 0,
          paymentMethod: 'CASH',
          amountReceived: 100,
        });

      const res = await api
        .get('/api/sales')
        .set('Authorization', `Bearer ${cashierToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.sales.length).toBe(1);
    });
  });
});
