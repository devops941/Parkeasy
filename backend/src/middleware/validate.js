import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

/**
 * Validates request schema using Zod
 * @param {import('zod').ZodSchema} schema - Zod schema (object with optional body, query, params)
 */
export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    // Replace with sanitized/parsed data
    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;
    return next();
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = error.errors.map((err) => ({
        field: err.path.slice(1).join('.'),
        message: err.message,
      }));
      return next(new AppError('Validation failed', 422, formattedErrors));
    }
    return next(error);
  }
};

