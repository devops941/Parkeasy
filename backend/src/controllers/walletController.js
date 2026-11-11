import crypto from 'crypto';
import Razorpay from 'razorpay';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';
import { Payment } from '../models/Payment.js';
import { Feedback } from '../models/Feedback.js';
import { TokenService } from '../services/tokenService.js';
import { PaymentService } from '../services/paymentService.js';
import { runInTransaction } from '../utils/transactionHelper.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { config } from '../config/env.js';

// Lazy-initialize Razorpay client if keys are configured
const getRazorpayClient = () => {
  if (config.razorpay.keyId && config.razorpay.keySecret) {
    return new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });
  }
  return null;
};

// =========================================================================
// 1. GET WALLET BALANCE
// =========================================================================
export const getWallet = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  return ApiResponse.success(res, 'Wallet details retrieved', {
    walletBalance: user.walletBalance,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      vehicleNumber: user.vehicleNumber,
    },
  });
});

// =========================================================================
// 2. GET WALLET TRANSACTION HISTORY
// =========================================================================
export const getWalletHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, type = 'all' } = req.query;

  const query = { user: req.user._id };
  if (type !== 'all') {
    query.type = type;
  }

  const skip = (page - 1) * limit;

  const [transactions, total, summary] = await Promise.all([
    Transaction.find(query)
      .populate('booking', 'vehicleNumber site entryTime exitTime')
      .populate('handler', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Transaction.countDocuments(query),
    Transaction.aggregate([
      { $match: { user: req.user._id, status: 'completed' } },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
        },
      },
    ]),
  ]);

  const totalsByType = {
    recharge: 0,
    parking: 0,
    refund: 0,
  };
  summary.forEach((item) => {
    if (totalsByType[item._id] !== undefined) {
      totalsByType[item._id] = item.totalAmount;
    }
  });

  return ApiResponse.success(res, 'Wallet transaction history retrieved', {
    transactions,
    totalsByType,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});

// =========================================================================
// 3. GET SIGNED PROFILE QR TOKEN
// =========================================================================
export const getProfileQR = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  // Generate short signed JWT profile QR token (purpose: 'profile')
  const profileQrToken = TokenService.generateQRToken(
    {
      userId: user._id.toString(),
      purpose: 'profile',
    },
    '7d'
  );

  return ApiResponse.success(res, 'User profile QR code token generated', {
    profileQrToken,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      vehicleNumber: user.vehicleNumber,
      walletBalance: user.walletBalance,
    },
    instructions:
      'Show this QR code to the parking handler for cash wallet recharge or quick walk-in check-in.',
  });
});

// =========================================================================
// 4. SIMULATED PAYMENT GATEWAY - CREATE RECHARGE ORDER
// =========================================================================
export const createRechargeOrder = asyncHandler(async (req, res) => {
  const { amount, idempotencyKey } = req.body;

  const { payment, isExisting } = await PaymentService.createOrder(
    req.user._id,
    amount,
    idempotencyKey
  );

  return ApiResponse.created(
    res,
    isExisting
      ? 'Existing recharge order retrieved (idempotent)'
      : 'Recharge order created successfully',
    {
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      idempotencyKey: payment.idempotencyKey,
      banner: 'Demo payment - no real money will be charged.',
      testCards: {
        success: '4242 4242 4242 4242 (Any future expiry / 3-digit CVV)',
        failure: '4000 0000 0000 0002 (Test card decline trigger)',
      },
    }
  );
});

// =========================================================================
// 5. SIMULATED PAYMENT GATEWAY - PROCESS DEMO CARD PAYMENT
// =========================================================================
export const processRechargePayment = asyncHandler(async (req, res, next) => {
  const { orderId, cardNumber, cardExpMonth, cardExpYear, cvv, cardHolderName } = req.body;

  // 1. Fetch & validate payment order state (guarantees idempotency)
  const payment = await PaymentService.getPaymentForProcessing(orderId, req.user._id);

  // 2. Evaluate card with payment service (never logs/stores full card or CVV)
  const cardEval = PaymentService.evaluateCard({
    cardNumber,
    cardExpMonth,
    cardExpYear,
    cvv,
    cardHolderName,
  });

  // 3. CASE: Card Evaluation Failed
  if (!cardEval.success) {
    payment.status = 'failed';
    payment.cardLast4 = cardEval.last4;
    payment.cardBrand = cardEval.brand;
    payment.failureReason = cardEval.reason;
    await payment.save();

    return next(
      AppError.badRequest(cardEval.reason || 'Payment failed: Card was declined', [
        {
          field: 'cardNumber',
          message:
            'Use test card 4242 4242 4242 4242 for successful simulated payments.',
        },
      ])
    );
  }

  // 4. CASE: Card Succeeded -> Atomic transaction to credit wallet & write Transaction record
  const result = await runInTransaction(async (session) => {
    // Atomically transition payment status from 'created' to 'completed'
    // This atomic query guarantees strict idempotency even if multiple requests arrive simultaneously
    const updatedPayment = await Payment.findOneAndUpdate(
      { _id: payment._id, status: 'created' },
      {
        status: 'completed',
        cardLast4: cardEval.last4,
        cardBrand: cardEval.brand,
      },
      { session, new: true }
    );

    if (!updatedPayment) {
      throw AppError.conflict(
        'Concurrent payment detected: This order has already been completed or updated.'
      );
    }

    // Atomically credit user's wallet
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { walletBalance: payment.amount } },
      { session, new: true }
    );

    // Create immutable financial transaction
    const transaction = await Transaction.create(
      [
        {
          user: req.user._id,
          type: 'recharge',
          amount: payment.amount,
          method: 'card',
          status: 'completed',
          gatewayRef: payment.orderId,
        },
      ],
      { session }
    );

    // Link transaction to payment record
    updatedPayment.transaction = transaction[0]._id;
    await updatedPayment.save({ session });

    return { updatedPayment, updatedUser, transaction: transaction[0] };
  });

  return ApiResponse.success(res, `Payment successful! ₹${payment.amount} credited to your wallet.`, {
    orderId: payment.orderId,
    amountCredited: payment.amount,
    newWalletBalance: result.updatedUser.walletBalance,
    cardLast4: cardEval.last4,
    cardBrand: cardEval.brand,
    status: 'completed',
    transactionId: result.transaction._id,
    banner: 'Demo payment - no real money was charged.',
  });
});

// =========================================================================
// 6. RAZORPAY - REAL / SANDBOX FALLBACK
// =========================================================================
export const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const razorpay = getRazorpayClient();

  if (!razorpay) {
    const mockOrderId = `order_sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    return ApiResponse.created(res, 'Simulated Razorpay order created (Test Mode)', {
      orderId: mockOrderId,
      amount: amount * 100,
      currency: 'INR',
      keyId: 'rzp_test_simulated_key',
      isSimulated: true,
    });
  }

  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency: 'INR',
    receipt: `rcpt_user_${req.user._id}_${Date.now()}`,
    notes: {
      userId: req.user._id.toString(),
      purpose: 'wallet_topup',
    },
  });

  return ApiResponse.created(res, 'Razorpay order created successfully', {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: config.razorpay.keyId,
    isSimulated: false,
  });
});

export const verifyRazorpayPayment = asyncHandler(async (req, res, next) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, amount } = req.body;

  if (config.razorpay.keySecret && !razorpayOrderId.startsWith('order_sim_')) {
    const generatedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      return next(AppError.badRequest('Razorpay payment signature verification failed'));
    }
  }

  const result = await runInTransaction(async (session) => {
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { walletBalance: amount } },
      { session, new: true }
    );

    const transaction = await Transaction.create(
      [
        {
          user: req.user._id,
          type: 'recharge',
          amount,
          method: 'card',
          status: 'completed',
          gatewayRef: razorpayPaymentId,
        },
      ],
      { session }
    );

    return { updatedUser, transaction: transaction[0] };
  });

  return ApiResponse.success(res, `Wallet recharged with ₹${amount} successfully`, {
    newWalletBalance: result.updatedUser.walletBalance,
    transaction: result.transaction,
  });
});

// =========================================================================
// 7. USER FEEDBACK
// =========================================================================
export const submitFeedback = asyncHandler(async (req, res) => {
  const { rating, message } = req.body;

  const feedback = await Feedback.create({
    user: req.user._id,
    rating,
    message,
  });

  return ApiResponse.created(res, 'Thank you! Your feedback has been submitted successfully.', {
    feedback,
  });
});
