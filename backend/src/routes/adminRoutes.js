import express from 'express';
import {
  // Handlers
  createHandler,
  getHandlers,
  getHandlerById,
  updateHandler,
  deleteHandler,
  // Sites
  createSite,
  getSites,
  getSiteById,
  updateSite,
  deleteSite,
  // Slots
  getSiteSlots,
  createSlot,
  updateSlot,
  deleteSlot,
  // Users
  getUsers,
  getUserById,
  toggleUserStatus,
  deleteUser,
  // Dashboard
  getDashboardStats,
  // History & Reports
  getParkingHistory,
  getRechargeHistory,
  getFeedbackList,
} from '../controllers/adminController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createHandlerSchema,
  updateHandlerSchema,
  createSiteSchema,
  updateSiteSchema,
  createSlotSchema,
  updateSlotSchema,
  paginationQuerySchema,
  objectIdParamSchema,
} from '../validations/adminValidation.js';

const router = express.Router();

// Guard all admin routes with authentication and admin role check
router.use(authenticate, authorize('admin'));

// =========================================================================
// Dashboard
// =========================================================================
router.get('/dashboard', getDashboardStats);

// =========================================================================
// Handlers Management
// =========================================================================
router.post('/handlers', validate(createHandlerSchema), createHandler);
router.get('/handlers', validate(paginationQuerySchema), getHandlers);
router.get('/handlers/:id', validate(objectIdParamSchema('id')), getHandlerById);
router.put('/handlers/:id', validate(updateHandlerSchema), updateHandler);
router.delete('/handlers/:id', validate(objectIdParamSchema('id')), deleteHandler);

// =========================================================================
// Parking Sites Management
// =========================================================================
router.post('/sites', validate(createSiteSchema), createSite);
router.get('/sites', validate(paginationQuerySchema), getSites);
router.get('/sites/:id', validate(objectIdParamSchema('id')), getSiteById);
router.put('/sites/:id', validate(updateSiteSchema), updateSite);
router.delete('/sites/:id', validate(objectIdParamSchema('id')), deleteSite);

// =========================================================================
// Parking Slots Management
// =========================================================================
router.get(
  '/sites/:siteId/slots',
  validate(objectIdParamSchema('siteId')),
  getSiteSlots
);
router.post('/sites/:siteId/slots', validate(createSlotSchema), createSlot);
router.put('/slots/:id', validate(updateSlotSchema), updateSlot);
router.delete('/slots/:id', validate(objectIdParamSchema('id')), deleteSlot);

// =========================================================================
// Users Management
// =========================================================================
router.get('/users', validate(paginationQuerySchema), getUsers);
router.get('/users/:id', validate(objectIdParamSchema('id')), getUserById);
router.patch('/users/:id/status', validate(objectIdParamSchema('id')), toggleUserStatus);
router.put('/users/:id/status', validate(objectIdParamSchema('id')), toggleUserStatus);
router.delete('/users/:id', validate(objectIdParamSchema('id')), deleteUser);

// =========================================================================
// Read-Only History, Reports & Feedback
// =========================================================================
router.get('/history/parking', validate(paginationQuerySchema), getParkingHistory);
router.get('/reports/parking-history', validate(paginationQuerySchema), getParkingHistory);

router.get('/history/recharges', validate(paginationQuerySchema), getRechargeHistory);
router.get('/reports/recharge-history', validate(paginationQuerySchema), getRechargeHistory);

router.get('/feedback', validate(paginationQuerySchema), getFeedbackList);
router.get('/reports/feedback', validate(paginationQuerySchema), getFeedbackList);

export default router;

