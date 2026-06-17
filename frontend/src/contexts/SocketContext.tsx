'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocketContext = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    console.log(`[Socket] Connecting to server at: ${apiUrl}`);

    const socketInstance = io(apiUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      autoConnect: true
    });

    socketInstance.on('connect', () => {
      console.log(`[Socket] Connected with ID: ${socketInstance.id}`);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('[Socket] Disconnected from server');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
    });

    setSocket(socketInstance);

    return () => {
      console.log('[Socket] Cleaning up socket connection...');
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
