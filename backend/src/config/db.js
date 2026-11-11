import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { config } from './env.js';

let devMongoInstance = null;

export const connectDB = async () => {
  // First, try standard connection
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn(`[MongoDB] Direct connection to ${config.mongoUri} failed: ${error.message}`);

    // In development mode with localhost URI, launch persistent embedded MongoDB
    const isLocalhost = config.mongoUri.includes('127.0.0.1') || config.mongoUri.includes('localhost');
    if (config.env === 'development' && isLocalhost) {
      console.log('[MongoDB] Starting embedded local persistent MongoDB instance for development...');
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const dbPath = path.resolve(process.cwd(), '.mongo_dev');
        if (!fs.existsSync(dbPath)) {
          fs.mkdirSync(dbPath, { recursive: true });
        }

        devMongoInstance = await MongoMemoryServer.create({
          instance: {
            port: 27017,
            dbPath,
            storageEngine: 'wiredTiger',
          },
        });

        const devUri = devMongoInstance.getUri() + 'parkeasy';
        console.log(`[MongoDB] Embedded local MongoDB running at: ${devUri}`);
        const conn = await mongoose.connect(devUri, { autoIndex: true });
        console.log('[MongoDB] Connected successfully to embedded local database');
        return conn;
      } catch (embeddedErr) {
        console.error('[MongoDB] Failed to start embedded local MongoDB:', embeddedErr.message);
        throw embeddedErr;
      }
    }

    if (config.env === 'production') {
      process.exit(1);
    }
    throw error;
  }
};

export const closeDB = async () => {
  try {
    await mongoose.connection.close(false);
    if (devMongoInstance) {
      await devMongoInstance.stop();
      devMongoInstance = null;
    }
  } catch (err) {
    console.error('[MongoDB] Error during disconnect:', err.message);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Disconnected from server');
});

mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB] Reconnected to server');
});


