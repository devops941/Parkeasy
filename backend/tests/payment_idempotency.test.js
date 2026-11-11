import request from 'supertest';
import app from '../src/app.js';
import { setupTestDB } from './setup.js';
import { User } from '../src/models/User.js';
import { TokenService } from '../src/services/tokenService.js';

describe('Simulated Payment Gateway & Idempotency Flow', () => {
  setupTestDB();

  let user, userToken;

  beforeEach(async () => {
    user = await User.create({
      name: 'Pay User',
      email: 'payuser@test.com',
      phone: '9555544444',
      passwordHash: 'hash',
      role: 'user',
      walletBalance: 0,
    });
    userToken = TokenService.generateAccessToken(user);
  });

  test('1. Successful Card Payment (4242...) credits wallet atomically', async () => {
    // 1. Create recharge order
    const orderRes = await request(app)
      .post('/api/v1/wallet/recharge/order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount: 300 });

    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.data.orderId;

    // 2. Pay using demo success card
    const payRes = await request(app)
      .post('/api/v1/wallet/recharge/pay')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        orderId,
        cardNumber: '4242 4242 4242 4242',
        cardExpMonth: 12,
        cardExpYear: 2028,
        cvv: '123',
        cardHolderName: 'Test Driver',
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.data.status).toBe('completed');
    expect(payRes.body.data.amountCredited).toBe(300);
    expect(payRes.body.data.newWalletBalance).toBe(300);
    expect(payRes.body.data.cardLast4).toBe('4242');

    // DB verify
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.walletBalance).toBe(300);
  });

  test('2. Duplicate Payment Verification (Replay Protection / Idempotency)', async () => {
    // 1. Create recharge order
    const orderRes = await request(app)
      .post('/api/v1/wallet/recharge/order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount: 150 });
    const orderId = orderRes.body.data.orderId;

    // 2. First payment succeeds
    const payRes1 = await request(app)
      .post('/api/v1/wallet/recharge/pay')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        orderId,
        cardNumber: '4242 4242 4242 4242',
        cardExpMonth: 12,
        cardExpYear: 2028,
        cvv: '123',
      });
    expect(payRes1.status).toBe(200);

    // 3. Second payment attempt on the SAME completed order -> must be rejected with 409 Conflict
    const payRes2 = await request(app)
      .post('/api/v1/wallet/recharge/pay')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        orderId,
        cardNumber: '4242 4242 4242 4242',
        cardExpMonth: 12,
        cardExpYear: 2028,
        cvv: '123',
      });

    expect(payRes2.status).toBe(409);
    expect(payRes2.body.message).toContain('already been completed and credited');

    // Wallet balance must strictly remain 150 (NOT 300)
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.walletBalance).toBe(150);
  });

  test('3. Card Decline Failure (4000 0000 0000 0002) - zero wallet credit', async () => {
    const orderRes = await request(app)
      .post('/api/v1/wallet/recharge/order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount: 500 });
    const orderId = orderRes.body.data.orderId;

    const payRes = await request(app)
      .post('/api/v1/wallet/recharge/pay')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        orderId,
        cardNumber: '4000 0000 0000 0002',
        cardExpMonth: 12,
        cardExpYear: 2028,
        cvv: '123',
      });

    expect(payRes.status).toBe(400);
    expect(payRes.body.message).toContain('Card declined');

    // Wallet balance should still be 0
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.walletBalance).toBe(0);
  });
});

