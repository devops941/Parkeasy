import express from 'express';
import {
  scanQr,
  confirmCashExit,
  rechargeUserWalletCash,
  createWalkinBooking,
  getHandlerHistory,
  getHandlerRecharges,
  getHandlerDashboardStats,
} from '../controllers/handlerController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  scanQrSchema,
  confirmCashSchema,
  rechargeCashSchema,
  walkinBookingSchema,
  handlerHistoryQuerySchema,
} from '../validations/handlerValidation.js';

const router = express.Router();

// All handler endpoints require handler or admin role
router.use(authenticate, authorize('handler', 'admin'));

// (0) Handler live dashboard summary
router.get('/dashboard', getHandlerDashboardStats);

// (1) Scan ticket or profile QR (entry or exit decision)
router.post('/scan', validate(scanQrSchema), scanQr);

// (2) Confirm cash shortfall / cash exit settlement
router.post('/exit/confirm-cash', validate(confirmCashSchema), confirmCashExit);

// (3) Cash wallet recharge by scanning user profile QR
router.post('/wallet/recharge', validate(rechargeCashSchema), rechargeUserWalletCash);

// (4) Walk-in booking at booth
router.post('/bookings', validate(walkinBookingSchema), createWalkinBooking);

// (5) Handler parking history (limited to handler's site)
router.get('/history', validate(handlerHistoryQuerySchema), getHandlerHistory);

// (6) Handler cash recharges history
router.get('/recharges', validate(handlerHistoryQuerySchema), getHandlerRecharges);

export default router;

