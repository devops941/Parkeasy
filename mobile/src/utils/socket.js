import { io } from 'socket.io-client';
import { apiClient } from '../api/client.js';

let socket = null;

export const connectSocket = (token) => {
  if (socket?.connected) return socket;

  // Strip /api/v1 suffix to get root server URL
  const baseURL = (apiClient.defaults.baseURL || '').replace(/\/api\/v1\/?$/, '');
  if (!baseURL) return null;

  if (socket) {
    socket.disconnect();
  }

  socket = io(baseURL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
    reconnectionDelay: 1500,
    reconnectionDelayMax: 5000,
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;
