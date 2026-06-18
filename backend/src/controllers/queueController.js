import Queue from '../models/Queue.js';
import Ticket from '../models/Ticket.js';
import { AppError } from '../middlewares/error.js';

/**
 * Get all queues (with members populated)
 */
export const getQueues = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role === 'Technician' && !req.user.hasAllQueueAccess) {
      filter.members = req.user._id;
    }

    const queues = await Queue.find(filter)
      .populate('members', 'name email role')
      .sort({ name: 1 });

    let resultQueues = queues;
    if (req.user.role === 'Technician' && req.user.clientId && req.user.clientId.name) {
      const clientName = req.user.clientId.name.toLowerCase();
      resultQueues = queues.filter(q => {
        const parts = q.name.split(' - ');
        const queueCompany = (parts.length > 1 ? parts[1].trim() : q.name).toLowerCase();
        return clientName.includes(queueCompany) || queueCompany.includes(clientName);
      });
    }

    res.status(200).json({
      status: 'success',
      data: { queues: resultQueues }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new queue
 */
export const createQueue = async (req, res, next) => {
  try {
    const { name, description, color, members } = req.body;

    const existing = await Queue.findOne({ name });
    if (existing) {
      return next(new AppError('A queue with this name already exists.', 400));
    }

    const queue = await Queue.create({ name, description, color, members: members || [] });
    await queue.populate('members', 'name email role');

    res.status(201).json({
      status: 'success',
      data: { queue }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a queue (name, description, color, active status)
 */
export const updateQueue = async (req, res, next) => {
  try {
    const { name, description, color, isActive } = req.body;
    const queue = await Queue.findById(req.params.id);

    if (!queue) return next(new AppError('Queue not found.', 404));

    if (name) queue.name = name;
    if (description !== undefined) queue.description = description;
    if (color) queue.color = color;
    if (isActive !== undefined) queue.isActive = isActive;

    await queue.save();
    await queue.populate('members', 'name email role');

    res.status(200).json({
      status: 'success',
      data: { queue }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update queue members (full replace)
 */
export const updateQueueMembers = async (req, res, next) => {
  try {
    const { members } = req.body;
    const queue = await Queue.findById(req.params.id);

    if (!queue) return next(new AppError('Queue not found.', 404));

    queue.members = members || [];
    await queue.save();
    await queue.populate('members', 'name email role');

    res.status(200).json({
      status: 'success',
      data: { queue }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a queue (nullify tickets assigned to it)
 */
export const deleteQueue = async (req, res, next) => {
  try {
    const queue = await Queue.findById(req.params.id);
    if (!queue) return next(new AppError('Queue not found.', 404));

    // Orphan tickets: send them back to unqueued
    await Ticket.updateMany({ queueId: queue._id }, { $set: { queueId: null } });

    await queue.deleteOne();

    res.status(200).json({
      status: 'success',
      message: 'Queue deleted. Affected tickets moved to Unqueued.'
    });
  } catch (error) {
    next(error);
  }
};
