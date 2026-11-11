import express from 'express';
import mongoose from 'mongoose';
import { ApiResponse } from '../utils/ApiResponse.js';

const router = express.Router();

router.get('/health', (req, res) => {
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const dbState = mongoose.connection.readyState;
  const isHealthy = dbState === 1;

  return ApiResponse.success(
    res,
    isHealthy ? 'ParkEasy API is healthy and connected' : 'ParkEasy API running (DB disconnected)',
    {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatusMap[dbState] || 'unknown',
        host: mongoose.connection.host || null,
        name: mongoose.connection.name || null,
      },
      environment: process.env.NODE_ENV || 'development',
    },
    isHealthy ? 200 : 503
  );
});

export default router;

