import { z } from 'zod';

// MongoDB ObjectId validation regex
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const objectIdParamSchema = (paramName = 'id') =>
  z.object({
    params: z.object({
      [paramName]: z
        .string()
        .regex(objectIdRegex, `Invalid ${paramName}: must be a 24-character hexadecimal ObjectId`),
    }),
  });

// Handler validations
export const createHandlerSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Invalid email address')
      .toLowerCase(),
    phone: z
      .string({ required_error: 'Phone is required' })
      .trim()
      .min(10, 'Phone must be at least 10 digits')
      .max(15),
    password: z
      .string({ required_error: 'Password is required' })
      .min(6, 'Password must be at least 6 characters'),
    assignedSite: z
      .string()
      .regex(objectIdRegex, 'assignedSite must be a valid ObjectId')
      .optional()
      .nullable(),
  }),
});

export const updateHandlerSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid handler ID'),
  }),
  body: z.object({
    name: z.string().trim().min(2).max(100).optional(),
    phone: z.string().trim().min(10).max(15).optional(),
    password: z.string().min(6).optional(),
    assignedSite: z
      .string()
      .regex(objectIdRegex, 'assignedSite must be a valid ObjectId')
      .nullable()
      .optional(),
    isActive: z.boolean().optional(),
  }),
});

// Parking Site validations
export const createSiteSchema = z.object({
  body: z.preprocess(
    (data) => {
      if (data && typeof data === 'object') {
        const copy = { ...data };
        if (copy.location && Array.isArray(copy.location.coordinates)) {
          if (copy.longitude === undefined) copy.longitude = copy.location.coordinates[0];
          if (copy.latitude === undefined) copy.latitude = copy.location.coordinates[1];
        }
        if (copy.totalSlots === undefined && copy.autoGenerateSlots !== undefined) {
          copy.totalSlots = copy.autoGenerateSlots;
        }
        return copy;
      }
      return data;
    },
    z.object({
      name: z
        .string({ required_error: 'Site name is required' })
        .trim()
        .min(2, 'Site name must be at least 2 characters')
        .max(120),
      address: z
        .string({ required_error: 'Address is required' })
        .trim()
        .min(3, 'Address must be at least 3 characters'),
      area: z
        .string({ required_error: 'Area is required' })
        .trim()
        .min(2, 'Area is required'),
      postalCode: z
        .string({ required_error: 'Postal code is required' })
        .trim()
        .min(3, 'Postal code is required'),
      latitude: z.coerce
        .number({ required_error: 'Latitude is required (-90 to 90)' })
        .min(-90)
        .max(90),
      longitude: z.coerce
        .number({ required_error: 'Longitude is required (-180 to 180)' })
        .min(-180)
        .max(180),
      hourlyRate: z.coerce
        .number({ required_error: 'Hourly rate is required' })
        .min(0, 'Hourly rate cannot be negative'),
      minimumCharge: z.coerce
        .number({ required_error: 'Minimum charge is required' })
        .min(0, 'Minimum charge cannot be negative'),
      totalSlots: z.coerce
        .number({ required_error: 'Total slots is required' })
        .int()
        .min(1, 'Total slots must be at least 1')
        .max(500, 'Total slots cannot exceed 500 per site'),
    })
  ),
});

export const updateSiteSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid site ID'),
  }),
  body: z.preprocess(
    (data) => {
      if (data && typeof data === 'object') {
        const copy = { ...data };
        if (copy.location && Array.isArray(copy.location.coordinates)) {
          if (copy.longitude === undefined) copy.longitude = copy.location.coordinates[0];
          if (copy.latitude === undefined) copy.latitude = copy.location.coordinates[1];
        }
        return copy;
      }
      return data;
    },
    z.object({
      name: z.string().trim().min(2).max(120).optional(),
      address: z.string().trim().min(3).optional(),
      area: z.string().trim().min(2).optional(),
      postalCode: z.string().trim().min(3).optional(),
      latitude: z.coerce.number().min(-90).max(90).optional(),
      longitude: z.coerce.number().min(-180).max(180).optional(),
      hourlyRate: z.coerce.number().min(0).optional(),
      minimumCharge: z.coerce.number().min(0).optional(),
      totalSlots: z.coerce.number().int().min(1).max(500).optional(),
      isActive: z.boolean().optional(),
    })
  ),
});

// Slot validations
export const createSlotSchema = z.object({
  params: z.object({
    siteId: z.string().regex(objectIdRegex, 'Invalid site ID'),
  }),
  body: z.object({
    slotNumber: z
      .string({ required_error: 'Slot number is required' })
      .trim()
      .toUpperCase()
      .min(1, 'Slot number cannot be empty'),
    status: z.enum(['available', 'disabled']).optional().default('available'),
  }),
});

export const updateSlotSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid slot ID'),
  }),
  body: z.object({
    slotNumber: z.string().trim().toUpperCase().min(1).optional(),
    status: z.enum(['available', 'reserved', 'occupied', 'disabled']).optional(),
  }),
});

// Query filters
export const paginationQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
    search: z.string().trim().optional(),
    isActive: z
      .enum(['true', 'false'])
      .transform((val) => val === 'true')
      .optional(),
    role: z.enum(['user', 'handler', 'admin']).optional(),
    status: z.string().optional(),
    siteId: z.string().regex(objectIdRegex).optional(),
    userId: z.string().regex(objectIdRegex).optional(),
    handlerId: z.string().regex(objectIdRegex).optional(),
    method: z.enum(['card', 'handler_cash', 'wallet']).optional(),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    startDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'startDate must be a valid ISO date',
      })
      .optional(),
    endDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'endDate must be a valid ISO date',
      })
      .optional(),
  }),
});

