import { z } from 'zod';

export const rechargeOrderSchema = z.object({
  body: z.object({
    amount: z
      .number({ required_error: 'Amount is required' })
      .min(1, 'Minimum recharge amount is ₹1')
      .max(20000, 'Maximum recharge amount is ₹20,000'),
    idempotencyKey: z.string().trim().optional(),
  }),
});

export const rechargePaySchema = z.object({
  body: z.object({
    orderId: z
      .string({ required_error: 'orderId is required' })
      .trim()
      .min(1, 'orderId cannot be empty'),
    cardNumber: z
      .string({ required_error: 'Card number is required' })
      .trim()
      .min(12, 'Card number must be at least 12 digits')
      .max(19, 'Card number cannot exceed 19 digits'),
    cardExpMonth: z.coerce
      .number({ required_error: 'Expiration month is required' })
      .int()
      .min(1, 'Invalid month')
      .max(12, 'Invalid month'),
    cardExpYear: z.coerce
      .number({ required_error: 'Expiration year is required' })
      .int()
      .min(2024, 'Card has expired')
      .max(2050, 'Invalid year'),
    cvv: z
      .string({ required_error: 'CVV is required' })
      .trim()
      .min(3, 'CVV must be 3 or 4 digits')
      .max(4, 'CVV must be 3 or 4 digits'),
    cardHolderName: z.string().trim().optional().default('Cardholder'),
  }),
});

export const createRazorpayOrderSchema = z.object({
  body: z.object({
    amount: z
      .number({ required_error: 'Amount is required' })
      .min(10, 'Minimum recharge amount is ₹10')
      .max(20000, 'Maximum recharge amount is ₹20,000'),
  }),
});

export const verifyRazorpayPaymentSchema = z.object({
  body: z.object({
    razorpayOrderId: z
      .string({ required_error: 'razorpayOrderId is required' })
      .min(1),
    razorpayPaymentId: z
      .string({ required_error: 'razorpayPaymentId is required' })
      .min(1),
    razorpaySignature: z
      .string({ required_error: 'razorpaySignature is required' })
      .min(1),
    amount: z
      .number({ required_error: 'Recharge amount is required' })
      .min(10),
  }),
});

export const walletHistoryQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(10),
    type: z.enum(['recharge', 'parking', 'refund', 'all']).optional().default('all'),
  }),
});

export const createFeedbackSchema = z.object({
  body: z.object({
    rating: z
      .number({ required_error: 'Rating is required (1-5)' })
      .int()
      .min(1, 'Rating must be at least 1 star')
      .max(5, 'Rating cannot exceed 5 stars'),
    message: z
      .string({ required_error: 'Feedback message is required' })
      .trim()
      .min(5, 'Message must be at least 5 characters')
      .max(1000, 'Message cannot exceed 1000 characters'),
  }),
});
