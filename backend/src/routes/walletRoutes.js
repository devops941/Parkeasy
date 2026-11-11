import express from 'express';
import {
  getWallet,
  getWalletHistory,
  getProfileQR,
  createRechargeOrder,
  processRechargePayment,
  createRazorpayOrder,
  verifyRazorpayPayment,
  submitFeedback,
} from '../controllers/walletController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  rechargeOrderSchema,
  rechargePaySchema,
  createRazorpayOrderSchema,
  verifyRazorpayPaymentSchema,
  walletHistoryQuerySchema,
  createFeedbackSchema,
} from '../validations/walletValidation.js';

const router = express.Router();

// All wallet endpoints require user authentication
router.use(authenticate);

// Balance & Profile
router.get('/', getWallet);
router.get('/history', validate(walletHistoryQuerySchema), getWalletHistory);
router.get('/profile-qr', getProfileQR);

// Simulated Payment Gateway (Recharge Wallet)
router.post('/recharge/order', validate(rechargeOrderSchema), createRechargeOrder);
router.post('/recharge/pay', validate(rechargePaySchema), processRechargePayment);

// Razorpay card top-up (alternative/fallback)
router.post('/razorpay/create-order', validate(createRazorpayOrderSchema), createRazorpayOrder);
router.post('/razorpay/verify', validate(verifyRazorpayPaymentSchema), verifyRazorpayPayment);

// Feedback endpoint for users
router.post('/feedback', validate(createFeedbackSchema), submitFeedback);

export default router;
