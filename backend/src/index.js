// src/index.js
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { GridFSBucket } from 'mongodb';
import http from 'http';

import { errorHandler, AppError } from './middlewares/error.js';
import { initSocket } from './config/socket.js';
import { initChangeStreams } from './sockets/changeStreams.js';

dotenv.config();
const app = express();
app.use(express.json());

// Create HTTP server and wrap Express app
const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server);

// Connect to MongoDB (use MONGO_URI from .env)
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    // Set up GridFS bucket
    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'media' });
    console.log('GridFS bucket ready');
    
    // Initialize MongoDB Change Streams watching Ticket model updates
    initChangeStreams(io);
  })
  .catch(err => console.error(err));

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working' });
});

// Route to trigger a ticket update and test change streams
app.post('/api/test/update-ticket', async (req, res, next) => {
  try {
    const Ticket = (await import('./models/Ticket.js')).default;
    let ticket = await Ticket.findOne();
    if (!ticket) {
      const clientId = new mongoose.Types.ObjectId();
      ticket = new Ticket({
        clientId,
        subject: 'Initial Test Ticket',
        description: 'Testing change streams and Socket.io.',
        matrix: { impact: 2, urgency: 2 }
      });
      await ticket.save();
    } else {
      ticket.subject = `Updated Test Ticket - ${new Date().toLocaleTimeString()}`;
      await ticket.save();
    }
    res.json({ message: 'Ticket modified successfully', ticket });
  } catch (error) {
    next(error);
  }
});

// Fallback for unmatched API routes
app.all(/.*/, (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handling middleware
app.use(errorHandler);

// Start server
const port = process.env.PORT || 5000;
server.listen(port, () => console.log(`Server running on port ${port}`));


