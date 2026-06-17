// src/index.js
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { GridFSBucket } from 'mongodb';
import http from 'http';

import { errorHandler, AppError } from './middlewares/error.js';
import { initSocket } from './config/socket.js';
import { initChangeStreams } from './sockets/changeStreams.js';
import authRoutes from './routes/api/v1/authRoutes.js';
import assetRoutes from './routes/api/v1/assetRoutes.js';
import emailParseRouter from './routes/webhooks/emailParse.js';
import chatOpsRouter from './routes/webhooks/chatOps.js';

dotenv.config();
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/assets', assetRoutes);
app.use('/api/v1/tickets/webhook/email', emailParseRouter);
app.use('/api/v1/tickets/webhook/chatops', chatOpsRouter);

// Create HTTP server and wrap Express app
const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server);

// Connect to MongoDB (use MONGO_URI from .env)
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");
    // Set up GridFS bucket
    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'media' });
    console.log('GridFS bucket ready');
    
    // Initialize MongoDB Change Streams watching Ticket model updates
    initChangeStreams(io);

    // Initialize background jobs
    try {
      const { initJobs, gracefulShutdownJobs } = await import('./jobs/index.js');
      await initJobs();

      // Setup graceful shutdown handlers for Agenda
      process.on('SIGTERM', async () => {
        console.log('SIGTERM signal received. Shutting down Agenda...');
        const { default: agenda } = await import('./config/agenda.js');
        await agenda.stop();
        process.exit(0);
      });
      process.on('SIGINT', async () => {
        console.log('SIGINT signal received. Shutting down Agenda...');
        const { default: agenda } = await import('./config/agenda.js');
        await agenda.stop();
        process.exit(0);
      });
    } catch (jobErr) {
      console.error('Failed to initialize background jobs:', jobErr);
    }
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


