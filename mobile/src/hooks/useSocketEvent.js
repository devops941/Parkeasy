import { useEffect, useRef } from 'react';
import { getSocket } from '../utils/socket.js';

/**
 * Subscribe to a Socket.IO event for the lifetime of the component.
 * Uses a ref so the latest handler is always called without re-subscribing.
 */
export const useSocketEvent = (event, handler) => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const cb = (...args) => handlerRef.current(...args);
    socket.on(event, cb);
    return () => socket.off(event, cb);
  }, [event]);
};
