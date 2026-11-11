import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/parkeasy?replicaSet=rs0',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'parkeasy_access_secret_fallback',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'parkeasy_refresh_secret_fallback',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    qrSecret: process.env.JWT_QR_SECRET || 'parkeasy_qr_secret_fallback',
  },
  corsOrigin: process.env.CORS_ORIGIN || '*',
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  },
};

