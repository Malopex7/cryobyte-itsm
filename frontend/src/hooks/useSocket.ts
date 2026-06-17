'use client';

import { useEffect } from 'react';
import { useSocketContext } from '../contexts/SocketContext';
import { Socket } from 'socket.io-client';

export const useSocket = (event?: string, callback?: (...args: unknown[]) => void) => {
  const { socket, isConnected } = useSocketContext();

  useEffect(() => {
    if (!socket || !event || !callback) return;

    socket.on(event, callback as Parameters<Socket['on']>[1]);

    return () => {
      socket.off(event, callback as Parameters<Socket['off']>[1]);
    };
  }, [socket, event, callback]);

  const emit = (eventName: string, data: unknown) => {
    if (socket && isConnected) {
      socket.emit(eventName, data);
    } else {
      console.warn(`[Socket] Cannot emit "${eventName}". Socket is not connected.`);
    }
  };

  return { socket, isConnected, emit };
};
