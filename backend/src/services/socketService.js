/**
 * socketService.js
 * Singleton that holds the Socket.IO server instance and exposes typed emitters.
 * Import `initSocket(httpServer)` once in server.js, then use the emitters anywhere.
 */

import { Server } from 'socket.io';
import { config } from '../config/env.js';
import { TokenService } from './tokenService.js';
import { User } from '../models/User.js';

let io = null;

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin === '*' ? '*' : config.corsOrigin.split(','),
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware — verifies JWT from handshake
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token;

      if (!token) return next(new Error('Authentication required'));

      const decoded = TokenService.verifyAccessToken(token);
      const user = await User.findById(decoded.id).select('_id role isActive');

      if (!user || !user.isActive) return next(new Error('User not found or inactive'));

      socket.userId = user._id.toString();
      socket.userRole = user.role;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    // Auto-join the user's private room on connect
    socket.join(`user:${socket.userId}`);

    // Allow client to subscribe to site-level slot updates
    socket.on('join:site', (siteId) => {
      if (siteId) socket.join(`site:${siteId}`);
    });

    socket.on('leave:site', (siteId) => {
      if (siteId) socket.leave(`site:${siteId}`);
    });

    socket.on('disconnect', () => {});
  });

  return io;
};

// ---------------------------------------------------------------------------
// Emitters (safe to call even if io hasn't been initialised yet)
// ---------------------------------------------------------------------------

/** Notify a specific user that one of their bookings changed state */
export const emitBookingUpdated = (userId, payload) => {
  if (!io) return;
  io.to(`user:${userId}`).emit('booking:updated', payload);
};

/** Notify subscribers of a site that its slot availability changed */
export const emitSlotsUpdated = (siteId, payload) => {
  if (!io) return;
  io.to(`site:${siteId}`).emit('site:slots_updated', payload);
};
