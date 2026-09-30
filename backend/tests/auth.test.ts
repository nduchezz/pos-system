import { api, resetDb, createBusiness, createAdmin, createCashier, login, prisma } from './helpers';

describe('Auth API', () => {
  beforeEach(async () => {
    await resetDb();
  });

  describe('POST /api/auth/register', () => {
    it('creates a business + admin user and returns JWT', async () => {
      const res = await api.post('/api/auth/register').send({
        businessName: 'Test Shop',
        ownerName: 'John Doe',
        email: 'john@testshop.com',
        password: 'password123',
        phone: '0712345678',
        address: 'Nairobi',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('ADMIN');

      const business = await prisma.business.findFirst({
        where: { email: 'john@testshop.com' },
      });
      expect(business).toBeTruthy();
      expect(business?.name).toBe('Test Shop');
    });

    it('rejects duplicate email', async () => {
      const payload = {
        businessName: 'Shop A',
        ownerName: 'John',
        email: 'dupe@test.com',
        password: 'password123',
        phone: '0712345678',
      };
      await api.post('/api/auth/register').send(payload).expect(201);
      const res = await api.post('/api/auth/register').send(payload);
      expect(res.status).toBe(409);
    });

    it('rejects invalid email format', async () => {
      const res = await api.post('/api/auth/register').send({
        businessName: 'Shop',
        ownerName: 'John',
        email: 'not-an-email',
        password: 'password123',
        phone: '0712345678',
      });
      expect(res.status).toBe(422);
    });

    it('rejects short password', async () => {
      const res = await api.post('/api/auth/register').send({
        businessName: 'Shop',
        ownerName: 'John',
        email: 'valid@test.com',
        password: '123',
        phone: '0712345678',
      });
      expect(res.status).toBe(422);
    });

    it('rejects short business name', async () => {
      const res = await api.post('/api/auth/register').send({
        businessName: 'A',
        ownerName: 'John',
        email: 'valid@test.com',
        password: 'password123',
        phone: '0712345678',
      });
      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in a valid admin', async () => {
      const business = await createBusiness();
      const { email, password } = await createAdmin(business.id);
      const res = await api.post('/api/auth/login').send({ email, password });
      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('ADMIN');
    });

    it('logs in a valid cashier', async () => {
      const business = await createBusiness();
      const { email, password } = await createCashier(business.id);
      const res = await api.post('/api/auth/login').send({ email, password });
      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('CASHIER');
    });

    it('rejects wrong password', async () => {
      const business = await createBusiness();
      const { email } = await createAdmin(business.id);
      const res = await api.post('/api/auth/login').send({
        email,
        password: 'wrong-password',
      });
      expect(res.status).toBe(401);
    });

    it('rejects non-existent email', async () => {
      const res = await api.post('/api/auth/login').send({
        email: 'nobody@nowhere.com',
        password: 'password123',
      });
      expect(res.status).toBe(401);
    });

    it('does not leak whether email exists', async () => {
      const business = await createBusiness();
      const { email } = await createAdmin(business.id);
      const wrongPass = await api.post('/api/auth/login').send({ email, password: 'wrong' });
      const noUser = await api.post('/api/auth/login').send({ email: 'ghost@test.com', password: 'wrong' });
      expect(wrongPass.body.message).toBe(noUser.body.message);
    });

    it('rejects a disabled user', async () => {
      const business = await createBusiness();
      const { user, email, password } = await createAdmin(business.id);
      await prisma.user.update({ where: { id: user.id }, data: { status: false } });
      const res = await api.post('/api/auth/login').send({ email, password });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns current user when valid token', async () => {
      const business = await createBusiness();
      const { email, password, user } = await createAdmin(business.id);
      const token = await login(email, password);
      const res = await api.get('/api/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.user.id).toBe(user.id);
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('rejects request without token', async () => {
      const res = await api.get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('rejects malformed token', async () => {
      const res = await api.get('/api/auth/me').set('Authorization', 'Bearer not.a.real.token');
      expect(res.status).toBe(401);
    });

    it('rejects expired token', async () => {
      const jwt = require('jsonwebtoken');
      const business = await createBusiness();
      const { user } = await createAdmin(business.id);
      const expiredToken = jwt.sign(
        { userId: user.id, businessId: business.id, role: 'ADMIN', email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: '-1s' }
      );
      const res = await api.get('/api/auth/me').set('Authorization', `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
    });
  });
});
