import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const scanQrSchema = z.object({
  body: z.object({
    qrToken: z
      .string({ required_error: 'QR token is required' })
      .trim()
      .min(10, 'Invalid QR token format'),
  }),
});

export const confirmCashSchema = z.object({
  body: z.object({
    bookingId: z
      .string({ required_error: 'bookingId is required' })
      .regex(objectIdRegex, 'Invalid booking ID'),
    cashCollected: z
      .number({ required_error: 'cashCollected amount is required' })
      .min(0, 'Cash collected cannot be negative'),
  }),
});

export const rechargeCashSchema = z.object({
  body: z.object({
    profileQrToken: z
      .string({ required_error: 'User profile QR token is required' })
      .trim()
      .min(10, 'Invalid profile QR token'),
    amount: z
      .number({ required_error: 'Recharge amount is required' })
      .min(10, 'Minimum cash recharge amount is ₹10')
      .max(10000, 'Maximum cash recharge per transaction is ₹10,000'),
  }),
});

export const walkinBookingSchema = z.object({
  body: z.object({
    vehicleNumber: z
      .string({ required_error: 'Vehicle number is required' })
      .trim()
      .toUpperCase()
      .min(3, 'Vehicle number must be at least 3 characters'),
    profileQrToken: z.string().trim().optional(),
    slotId: z.string().regex(objectIdRegex, 'Invalid slot ID').optional(),
    name: z.string().trim().optional(),
    phone: z.string().trim().min(10).max(15).optional(),
    bookedHours: z.coerce.number().min(1).max(24).optional().default(4),
  }),
});

export const handlerHistoryQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(10),
    status: z.enum(['booked', 'active', 'completed', 'cancelled', 'expired', 'all']).optional(),
    startDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), 'startDate must be a valid ISO date')
      .optional(),
    endDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), 'endDate must be a valid ISO date')
      .optional(),
  }),
});

