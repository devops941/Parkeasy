import rateLimit from 'express-rate-limit';
import { ApiResponse } from '../utils/ApiResponse.js';
import { config } from '../config/env.js';

const isDev = config.env === 'development';

// In development, use a no-op middleware so rate limits never fire
const noopLimiter = (_req, _res, next) => next();

export const globalLimiter = isDev
  ? noopLimiter
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req, res) => {
        ApiResponse.error(res, 'Too many requests from this IP, please try again after 15 minutes', 429);
      },
    });

export const authLimiter = isDev
  ? noopLimiter
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        ApiResponse.error(res, 'Too many authentication attempts, please try again after 15 minutes', 429);
      },
    });

