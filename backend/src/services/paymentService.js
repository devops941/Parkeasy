import crypto from 'crypto';
import { Payment } from '../models/Payment.js';
import { AppError } from '../utils/AppError.js';

export class PaymentService {
  /**
   * Creates a payment order record.
   * If an idempotencyKey is provided and an order already exists, returns the existing order.
   *
   * @param {string} userId - User ID requesting the order
   * @param {number} amount - Amount in INR
   * @param {string} [idempotencyKey] - Client idempotency key
   * @returns {Promise<Payment>}
   */
  static async createOrder(userId, amount, idempotencyKey = null) {
    // 1. Idempotency check if key provided
    if (idempotencyKey) {
      const existing = await Payment.findOne({
        user: userId,
        idempotencyKey,
      });
      if (existing) {
        return { payment: existing, isExisting: true };
      }
    }

    // 2. Generate unique order ID
    const randomHex = crypto.randomBytes(4).toString('hex');
    const orderId = `order_sim_${Date.now()}_${randomHex}`;

    // 3. Create payment record
    const payment = await Payment.create({
      orderId,
      user: userId,
      amount,
      currency: 'INR',
      status: 'created',
      idempotencyKey: idempotencyKey || null,
    });

    return { payment, isExisting: false };
  }

  /**
   * Evaluates demo card details against the test rules.
   * Never stores or returns the card number or CVV.
   *
   * Rules:
   *  - 4242 4242 4242 4242 -> Success (Visa)
   *  - 4000 0000 0000 0002 -> Fails (Card explicitly declined for test)
   *  - Any other number   -> Fails (Card declined by issuer)
   *
   * @param {object} cardData - { cardNumber, cardExpMonth, cardExpYear, cvv, cardHolderName }
   * @returns {{ success: boolean, last4: string, brand: string, reason?: string }}
   */
  static evaluateCard(cardData) {
    const rawNumber = String(cardData.cardNumber || '').replace(/[\s-]/g, '');
    const last4 = rawNumber.slice(-4) || 'XXXX';

    // Test card 1: Success
    if (rawNumber === '4242424242424242') {
      return {
        success: true,
        last4,
        brand: 'Visa',
      };
    }

    // Test card 2: Deliberate failure test
    if (rawNumber === '4000000000000002') {
      return {
        success: false,
        last4,
        brand: 'Visa',
        reason: 'Payment failed: Card declined (Test card trigger)',
      };
    }

    // Any other card: Generic decline
    return {
      success: false,
      last4,
      brand: 'Unknown',
      reason: 'Payment failed: Card declined by issuing bank',
    };
  }

  /**
   * Verifies the payment order state before processing.
   * Ensures idempotency: completed orders cannot be processed again.
   *
   * @param {string} orderId
   * @param {string} userId
   * @returns {Promise<Payment>}
   */
  static async getPaymentForProcessing(orderId, userId) {
    const payment = await Payment.findOne({ orderId, user: userId });

    if (!payment) {
      throw AppError.notFound('Payment order not found or does not belong to this user');
    }

    if (payment.status === 'completed') {
      throw AppError.conflict(
        `This payment order (#${orderId}) has already been completed and credited. Duplicate charges are blocked.`
      );
    }

    if (payment.status === 'failed') {
      throw AppError.badRequest(
        `This payment order (#${orderId}) previously failed: "${payment.failureReason || 'Declined'}". Please create a new recharge order.`
      );
    }

    return payment;
  }
}

