
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { config } from './config/env.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { AppError } from './utils/AppError.js';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import parkingRoutes from './routes/parkingRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import handlerRoutes from './routes/handlerRoutes.js';
import { getProfileQR, submitFeedback } from './controllers/walletController.js';
import { getFeedbackList } from './controllers/adminController.js';
import { authenticate, authorize } from './middleware/auth.js';
import { validate } from './middleware/validate.js';
import { createFeedbackSchema } from './validations/walletValidation.js';
import { paginationQuerySchema } from './validations/adminValidation.js';

const app = express();

// Trust reverse proxies (Render, Railway, Heroku, Cloudflare)
app.set('trust proxy', 1);

// Security HTTP headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.corsOrigin === '*' ? '*' : config.corsOrigin.split(','),
    credentials: true,
  })
);

// Request rate limiting
app.use('/api', globalLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (config.env !== 'test') {
  app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));
}

// Root & API info routes
app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'ParkEasy API is running',
    health: '/api/v1/health',
    apiBase: '/api/v1',
  });
});

app.get('/api/v1', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'ParkEasy API v1',
    health: '/api/v1/health',
  });
});

// API Routes
app.use('/api/v1', healthRoutes);

// Database readiness guard (bypasses /health)
app.use('/api/v1', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database service is connecting or unavailable. Please verify MongoDB is running.',
    });
  }
  next();
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/parking', parkingRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/handler', handlerRoutes);
app.get('/api/v1/me/qr', authenticate, getProfileQR);

// Direct feedback endpoints
app.post('/api/v1/feedback', authenticate, validate(createFeedbackSchema), submitFeedback);
app.get('/api/v1/feedback', authenticate, authorize('admin'), validate(paginationQuerySchema), getFeedbackList);

// 404 Handler for undefined routes
app.all('*', (req, res, next) => {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
});

// Central Error Handler
app.use(errorHandler);

export default app;

