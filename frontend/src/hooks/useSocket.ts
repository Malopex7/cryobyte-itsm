'use client';

import { useEffect } from 'react';
import { useSocketContext } from '../contexts/SocketContext';

export const useSocket = (event?: string, callback?: (...args: any[]) => void) => {
  const { socket, isConnected } = useSocketContext();

  useEffect(() => {
    if (!socket || !event || !callback) return;

    socket.on(event, callback);

    return () => {
      socket.off(event, callback);
    };
  }, [socket, event, callback]);

  const emit = (eventName: string, data: any) => {
    if (socket && isConnected) {
      socket.emit(eventName, data);
    } else {
      console.warn(`[Socket] Cannot emit "${eventName}". Socket is not connected.`);
    }
  };

  return { socket, isConnected, emit };
};
