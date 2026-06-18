import Client from '../models/Client.js';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import Queue from '../models/Queue.js';
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
 * Get all technicians + admins (for assignment dropdowns)
 */
export const getTechnicians = async (req, res, next) => {
  try {
    const { queueId, clientId } = req.query;
    const query = { role: 'Technician', hasAllQueueAccess: { $ne: true } };

    if (queueId) {
      const queue = await Queue.findById(queueId);
      if (queue && queue.members && queue.members.length > 0) {
        query._id = { $in: queue.members };
      } else {
        query._id = { $in: [] };
      }
    }

    if (clientId) {
      query.$or = [
        { clientId: clientId },
        { clientId: { $exists: false } },
        { clientId: null }
      ];
    }

    const technicians = await User.find(query)
      .select('name email role hasAllQueueAccess clientId')
      .sort({ name: 1 });

    res.status(200).json({
      status: 'success',
      data: { technicians }
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
    const { role, clientId, hasAllQueueAccess } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new AppError('No user found with that ID', 404));
    }

    if (role) user.role = role;

    // Client role requires a company; other roles can optionally have one
    const effectiveRole = role || user.role;
    if (effectiveRole === 'Client' && !clientId) {
      return next(new AppError('Client ID is required when role is Client.', 400));
    }
    user.clientId = clientId || undefined;

    // Dispatcher access is ONLY meaningful for Technician role.
    // Admin has full access by role; Client should never dispatch.
    if (hasAllQueueAccess !== undefined) {
      user.hasAllQueueAccess = effectiveRole === 'Technician' ? hasAllQueueAccess : false;
    } else if (role && role !== 'Technician') {
      // If the role is being changed away from Technician, strip the flag
      user.hasAllQueueAccess = false;
    }

    await user.save();

    res.status(200).json({
      status: 'success',
      data: { user }
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

/**
 * Admin-create a single user (replaces public self-registration)
 */
export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, clientId, hasAllQueueAccess } = req.body;

    if (!name || !email || !password || !role) {
      return next(new AppError('Name, email, password, and role are required.', 400));
    }
    if (role === 'Client' && !clientId) {
      return next(new AppError('A client company (clientId) is required for the Client role.', 400));
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return next(new AppError(`A user with email "${email}" already exists.`, 400));
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role,
      clientId: clientId || undefined,
      hasAllQueueAccess: hasAllQueueAccess || false
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({ status: 'success', data: { user: userResponse } });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk-create users from an array (mass onboarding)
 * Body: { users: [{ name, email, password, role, clientId?, hasAllQueueAccess? }] }
 * Returns per-row results: { summary, created[], failed[] }
 */
export const bulkCreateUsers = async (req, res, next) => {
  try {
    const { users } = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      return next(new AppError('Provide a non-empty "users" array.', 400));
    }
    if (users.length > 500) {
      return next(new AppError('Maximum 500 users per bulk import.', 400));
    }

    const created = [];
    const failed = [];

    for (const row of users) {
      const { name, email, password, role, clientId, hasAllQueueAccess } = row;

      if (!name || !email || !password || !role) {
        failed.push({ email: email || '(missing)', reason: 'Missing required field: name / email / password / role.' });
        continue;
      }
      if (role === 'Client' && !clientId) {
        failed.push({ email, reason: 'Client role requires a clientId.' });
        continue;
      }

      try {
        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) {
          failed.push({ email, reason: 'Email already in use.' });
          continue;
        }
        const user = await User.create({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password,
          role,
          clientId: clientId || undefined,
          hasAllQueueAccess: hasAllQueueAccess || false
        });
        const u = user.toObject();
        delete u.password;
        created.push(u);
      } catch (err) {
        failed.push({ email, reason: err.message });
      }
    }

    res.status(201).json({
      status: 'success',
      data: {
        summary: { total: users.length, created: created.length, failed: failed.length },
        created,
        failed
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a user account (Admin only, cannot self-delete)
 */
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError('No user found with that ID.', 404));

    if (user._id.toString() === req.user._id.toString()) {
      return next(new AppError('You cannot delete your own account.', 400));
    }

    await user.deleteOne();
    res.status(200).json({ status: 'success', message: 'User deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
