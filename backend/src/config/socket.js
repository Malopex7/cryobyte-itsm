import { Server } from 'socket.io';
import { registerPresenceHandlers } from '../sockets/eventHandlers.js';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    // Register real-time field presence handlers
    registerPresenceHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized yet.');
  }
  return io;
};
