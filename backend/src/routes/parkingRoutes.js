import express from 'express';
import {
  getNearbySites,
  getSitesWithFilter,
  getSiteSlotsWithAvailability,
  createBooking,
  cancelBooking,
  userExitBooking,
  getMyBookings,
  getBookingById,
} from '../controllers/parkingController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  nearbyQuerySchema,
  sitesFilterSchema,
  siteIdParamSchema,
  bookingIdParamSchema,
  createBookingSchema,
  myBookingsQuerySchema,
} from '../validations/parkingValidation.js';

const router = express.Router();

// =========================================================================
// Public / User Search & Discovery Routes
// =========================================================================

// (a) Nearby sites search (10km auto-search & 5km filter)
router.get('/sites/nearby', validate(nearbyQuerySchema), getNearbySites);

// (b) Sites search with area and postalCode filters
router.get('/sites', validate(sitesFilterSchema), getSitesWithFilter);

// (c) Site slots with live availability status
router.get('/sites/:id/slots', validate(siteIdParamSchema), getSiteSlotsWithAvailability);

// =========================================================================
// Authenticated Booking Routes
// =========================================================================

// (d) Atomic slot booking & short signed QR ticket token
router.post('/bookings', authenticate, validate(createBookingSchema), createBooking);

// (e) Cancel booking before entry & release slot
router.post(
  '/bookings/:id/cancel',
  authenticate,
  validate(bookingIdParamSchema),
  cancelBooking
);

// (f) User self-exit / complete active parking session
router.post(
  '/bookings/:id/exit',
  authenticate,
  validate(bookingIdParamSchema),
  userExitBooking
);

// (g) User booking history (current + previous)
router.get('/bookings/mine', authenticate, validate(myBookingsQuerySchema), getMyBookings);

// (h) Single booking status — polled by the ticket screen for live updates
router.get('/bookings/:id', authenticate, validate(bookingIdParamSchema), getBookingById);

export default router;

