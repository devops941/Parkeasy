import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const nearbyQuerySchema = z.object({
  query: z.object({
    lat: z.coerce
      .number({ required_error: 'lat (latitude) is required' })
      .min(-90)
      .max(90),
    lng: z.coerce
      .number({ required_error: 'lng (longitude) is required' })
      .min(-180)
      .max(180),
    radius: z.coerce
      .number()
      .min(0.1, 'Radius must be at least 0.1 km')
      .max(100, 'Radius cannot exceed 100 km')
      .optional()
      .default(10), // Default 10 km
  }),
});

export const sitesFilterSchema = z.object({
  query: z.object({
    area: z.string().trim().optional(),
    postalCode: z.string().trim().optional(),
    search: z.string().trim().optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  }),
});

export const siteIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid site ID'),
  }),
});

export const bookingIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid booking ID'),
  }),
});

export const createBookingSchema = z.object({
  body: z.object({
    siteId: z.string().regex(objectIdRegex, 'siteId must be a valid ObjectId'),
    slotId: z.string().regex(objectIdRegex, 'slotId must be a valid ObjectId').optional(),
    vehicleNumber: z
      .string()
      .trim()
      .toUpperCase()
      .min(3, 'Vehicle number must be at least 3 characters')
      .optional(),
    bookedHours: z.coerce
      .number()
      .min(0.5, 'Minimum booking duration is 30 minutes (0.5 hours)')
      .max(48, 'Maximum single booking duration is 48 hours')
      .optional()
      .default(2),
    bookedUntil: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), 'bookedUntil must be a valid ISO date')
      .optional(),
  }),
});

export const myBookingsQuerySchema = z.object({
  query: z.object({
    type: z.enum(['current', 'previous', 'all']).optional().default('all'),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  }),
});

