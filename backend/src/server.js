import { createServer } from 'http';
import app from './app.js';
import { config } from './config/env.js';
import { connectDB, closeDB } from './config/db.js';
import { initExpireBookingsJob } from './jobs/expireBookingsJob.js';
import { initSocket } from './services/socketService.js';

const startServer = async () => {
  try {
    console.log('[Bootstrap] Initializing database connection...');
    await connectDB();
    initExpireBookingsJob();
  } catch (error) {
    console.error(`[Bootstrap] Error: MongoDB connection failed (${error.message}).`);
  }

  // Wrap Express in a plain HTTP server so Socket.IO shares the same port
  const server = createServer(app);
  initSocket(server);

  server.listen(config.port, () => {
    console.log(`[ParkEasy API] Server running in ${config.env} mode on port ${config.port}`);
    console.log(`[ParkEasy API] Health check: http://localhost:${config.port}/api/v1/health`);
    console.log(`[ParkEasy WS]  Socket.IO ready on ws://localhost:${config.port}`);
  });

  const shutdown = async (signal) => {
    console.log(`[Server] Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
      console.log('[Server] HTTP server closed');
      try {
        await closeDB();
        console.log('[MongoDB] Connection closed safely');
        process.exit(0);
      } catch (err) {
        console.error('[MongoDB] Error during disconnect:', err);
        process.exit(1);
      }
    });

    setTimeout(() => {
      console.error('[Server] Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer();
