import Client from '../models/Client.js';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import { AppError } from '../middlewares/error.js';

/**
 * Get list of all clients (detailed)
 */
export const getClients = async (req, res, next) => {
  try {
    const clients = await Client.find().sort({ name: 1 });
    res.status(200).json({
      status: 'success',
      data: {
        clients
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new client company
 */
export const createClient = async (req, res, next) => {
  try {
    const { name, domains, contactEmail, contactPhone, address, sla } = req.body;

    const existingClient = await Client.findOne({ name });
    if (existingClient) {
      return next(new AppError('A client company with this name already exists.', 400));
    }

    const client = await Client.create({
      name,
      domains,
      contactEmail,
      contactPhone,
      address,
      sla
    });

    res.status(201).json({
      status: 'success',
      data: {
        client
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all users
 */
export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .populate('clientId', 'name')
      .sort({ name: 1 });

    res.status(200).json({
      status: 'success',
      data: {
        users
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user role and company association
 */
export const updateUser = async (req, res, next) => {
  try {
    const { role, clientId } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new AppError('No user found with that ID', 404));
    }

    if (role) user.role = role;
    if (role === 'Client') {
      if (!clientId) {
        return next(new AppError('Client ID is required when role is Client.', 400));
      }
      user.clientId = clientId;
    } else {
      user.clientId = undefined; // Clear company association if role is Tech/Admin
    }

    await user.save();

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get admin stats/metrics
 */
export const getAdminMetrics = async (req, res, next) => {
  try {
    const totalTickets = await Ticket.countDocuments();
    const activeTickets = await Ticket.countDocuments({ status: { $in: ['New', 'In Progress', 'Waiting on Client'] } });
    const resolvedTickets = await Ticket.countDocuments({ status: { $in: ['Resolved', 'Closed'] } });

    // SLA Breaches
    const breachedTickets = await Ticket.countDocuments({
      $or: [
        { 'sla.ackBreached': true },
        { 'sla.resolveBreached': true }
      ]
    });

    // Calculate compliance rate
    const complianceRate = totalTickets > 0 
      ? Math.round(((totalTickets - breachedTickets) / totalTickets) * 1000) / 10
      : 100;

    // Active Techs
    const activeTechs = await User.countDocuments({ role: 'Technician' });

    res.status(200).json({
      status: 'success',
      data: {
        metrics: {
          totalTickets,
          activeTickets,
          resolvedTickets,
          breachedTickets,
          complianceRate,
          activeTechs
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
