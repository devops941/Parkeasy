import request from 'supertest';
import app from '../src/app.js';
import { setupTestDB } from './setup.js';
import { User } from '../src/models/User.js';

describe('Auth & Role Protection Flow', () => {
  setupTestDB();

  test('1. User Registration - Success & duplicate rejection', async () => {
    const payload = {
      name: 'Alice Driver',
      email: 'alice@test.com',
      phone: '9876543210',
      password: 'Password@123',
      vehicleNumber: 'KA-01-AB-1234',
    };

    // Register user
    const res = await request(app).post('/api/v1/auth/register').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('alice@test.com');
    expect(res.body.data.user.role).toBe('user');
    expect(res.body.data.accessToken).toBeDefined();

    // Duplicate email registration should fail
    const dupRes = await request(app).post('/api/v1/auth/register').send(payload);
    expect(dupRes.status).toBe(409);
    expect(dupRes.body.success).toBe(false);
  });

  test('2. User Login - Valid and invalid credentials', async () => {
    // Create user in DB
    const passwordHash = await User.hashPassword('Secret@123');
    await User.create({
      name: 'Bob Test',
      email: 'bob@test.com',
      phone: '9888877777',
      passwordHash,
      role: 'user',
    });

    // Valid login
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'bob@test.com',
      password: 'Secret@123',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();

    // Invalid password
    const failRes = await request(app).post('/api/v1/auth/login').send({
      email: 'bob@test.com',
      password: 'WrongPassword',
    });
    expect(failRes.status).toBe(401);
  });

  test('3. Role Protection - User vs Admin authorization', async () => {
    // Register normal user
    const userReg = await request(app).post('/api/v1/auth/register').send({
      name: 'Regular User',
      email: 'user@test.com',
      phone: '9111122222',
      password: 'Password@123',
    });
    const userToken = userReg.body.data.accessToken;

    // Normal user attempts to access /admin/dashboard -> should receive 403 Forbidden
    const deniedRes = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${userToken}`);
    expect(deniedRes.status).toBe(403);
    expect(deniedRes.body.message).toContain('Access denied');

    // Create Admin user
    const adminPassHash = await User.hashPassword('Admin@12345');
    const admin = await User.create({
      name: 'Super Admin',
      email: 'admin@test.com',
      phone: '9000000000',
      passwordHash: adminPassHash,
      role: 'admin',
    });

    // Login as Admin
    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@test.com',
      password: 'Admin@12345',
    });
    const adminToken = adminLogin.body.data.accessToken;

    // Admin accesses /admin/dashboard -> should receive 200 OK
    const adminRes = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.success).toBe(true);
    expect(adminRes.body.data.overview).toBeDefined();
  });
});

