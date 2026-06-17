import mongoose from 'mongoose';
import Ticket from '../models/Ticket.js';
import Client from '../models/Client.js';
import Queue from '../models/Queue.js';
import { AppError } from '../middlewares/error.js';
import { calculateSlaTargets, calculatePauseDelta } from '../services/slaEngine.js';

/**
 * Get all tickets (filtered by role & queue access)
 */
export const getTickets = async (req, res, next) => {
  try {
    const filter = {};

    // Clients can only view tickets belonging to their company
    if (req.user.role === 'Client') {
      if (!req.user.clientId) {
        return next(new AppError('Your user account is not associated with any client company.', 400));
      }
      filter.clientId = req.user.clientId;
    } else if (req.user.role === 'Technician' && !req.user.hasAllQueueAccess) {
      // Regular technicians: only see tickets in their queues
      const memberQueues = await Queue.find({ members: req.user._id, isActive: true }).select('_id');
      const queueIds = memberQueues.map(q => q._id);
      filter.queueId = { $in: queueIds };
    }
    // Admins and users with hasAllQueueAccess see everything

    // Support query filtering
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.queueId) filter.queueId = req.query.queueId === 'unqueued' ? null : req.query.queueId;

    const tickets = await Ticket.find(filter)
      .populate('clientId', 'name')
      .populate('assignedTechnicianId', 'name email')
      .populate('queueId', 'name color')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: tickets.length,
      data: {
        tickets
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single ticket
 */
export const getTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('clientId', 'name')
      .populate('assignedTechnicianId', 'name email')
      .populate('queueId', 'name color');

    if (!ticket) {
      return next(new AppError('No ticket found with that ID', 404));
    }

    // Access check: Clients can only access their own company's tickets
    if (req.user.role === 'Client' && ticket.clientId._id.toString() !== req.user.clientId.toString()) {
      return next(new AppError('You do not have permission to access this ticket.', 403));
    }

    // Technicians without all-queue access can only access tickets in their queues
    if (req.user.role === 'Technician' && !req.user.hasAllQueueAccess) {
      const memberQueues = await Queue.find({ members: req.user._id, isActive: true }).select('_id');
      const queueIds = memberQueues.map(q => q._id.toString());
      const ticketQueueId = ticket.queueId?._id?.toString() || ticket.queueId?.toString();
      if (!ticketQueueId || !queueIds.includes(ticketQueueId)) {
        return next(new AppError('You do not have permission to access this ticket.', 403));
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        ticket
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new ticket (calculating SLA targets)
 */
export const createTicket = async (req, res, next) => {
  try {
    const { subject, description, matrix, attachments } = req.body;
    let clientId = req.body.clientId;

    // Clients are forced to use their account's associated company ID
    if (req.user.role === 'Client') {
      clientId = req.user.clientId;
    }

    if (!clientId) {
      return next(new AppError('Please provide a client/company ID.', 400));
    }

    // Retrieve client to fetch custom SLA settings
    const client = await Client.findById(clientId);
    if (!client) {
      return next(new AppError('Client company not found.', 404));
    }

    // Clients cannot set their own priority. Force to P4 (Low Impact, Low Urgency)
    let finalMatrix = matrix;
    if (req.user.role === 'Client') {
      finalMatrix = { impact: 1, urgency: 1 };
    }

    // Create instance to run pre-save hook (which calculates priority)
    const ticket = new Ticket({
      clientId,
      subject,
      description,
      matrix: finalMatrix,
      attachments,
      status: 'New'
    });

    // Run priority evaluation pre-save hook logic manually to generate targets
    // before the actual save, or save it and let hook calculate.
    // Wait, the hook runs pre-save. To calculate targets properly, we should
    // let it calculate priority, then run calculation, or do it on pre-save hook in model!
    // Since ticket.priority is calculated on pre-save, we can calculate SLA targets inside the pre-save hook in Ticket.js, OR calculate it right here.
    // To keep it simple and clean, let's calculate priority manually here, then calculate targets and save.
    
    const impact = finalMatrix?.impact || 2;
    const urgency = finalMatrix?.urgency || 2;
    let calculatedPriority = 'P3';
    if (impact === 3 && urgency === 3) calculatedPriority = 'P1';
    else if ((impact === 3 && urgency === 2) || (impact === 2 && urgency === 3)) calculatedPriority = 'P2';
    else if ((impact === 2 && urgency === 2) || (impact === 1 && urgency === 3)) calculatedPriority = 'P3';
    else calculatedPriority = 'P4';

    ticket.priority = calculatedPriority;

    const slaTargets = calculateSlaTargets(calculatedPriority, new Date(), client.sla);
    ticket.sla = {
      ackTarget: slaTargets.ackTarget,
      resolveTarget: slaTargets.resolveTarget,
      ackBreached: false,
      resolveBreached: false
    };

    await ticket.save();

    res.status(201).json({
      status: 'success',
      data: {
        ticket
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update ticket details & handle pause/resume clock mechanics
 */
export const updateTicket = async (req, res, next) => {
  try {
    let { status } = req.body;
    const { assignedTechnicianId, subject, description, matrix, attachments, pauseReason, note, queueId } = req.body;

    
    let ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return next(new AppError('No ticket found with that ID', 404));
    }

    // Access control
    if (req.user.role === 'Client' && ticket.clientId.toString() !== req.user.clientId.toString()) {
      return next(new AppError('You do not have permission to modify this ticket.', 403));
    }

    // Old status & priority for comparison
    const oldStatus = ticket.status;
    const oldPriority = ticket.priority;

    // Apply basic text updates
    if (subject) ticket.subject = subject;
    if (description) ticket.description = description;
    if (attachments) ticket.attachments = attachments;

    // Queue assignment: only Admins and Dispatchers (hasAllQueueAccess) can change queue
    if (queueId !== undefined && req.user.role !== 'Client') {
      if (req.user.role === 'Admin' || req.user.hasAllQueueAccess) {
        const oldQueueId = ticket.queueId?.toString() || 'unqueued';
        const newQueueId = queueId || null;
        let newQueueName = 'Unqueued';
        if (newQueueId) {
          const queueDoc = await Queue.findById(newQueueId);
          if (!queueDoc) return next(new AppError('Queue not found.', 404));
          newQueueName = queueDoc.name;
        }
        ticket.queueId = newQueueId;
        ticket.notes.push({
          text: `Ticket routed to queue: ${newQueueName} by ${req.user.name}.`,
          author: 'System',
          type: 'system'
        });
      } else {
        return next(new AppError('Only dispatchers and admins can change the queue assignment.', 403));
      }
    }

    // Technicians & Admins can assign staff
    if (req.user.role !== 'Client' && assignedTechnicianId !== undefined) {
      const oldAssigned = ticket.assignedTechnicianId;
      if (assignedTechnicianId && String(oldAssigned) !== String(assignedTechnicianId)) {
        let techName = 'Unknown Technician';
        if (String(assignedTechnicianId) === String(req.user._id)) {
          techName = req.user.name;
        } else {
          const User = mongoose.model('User');
          const techUser = await User.findById(assignedTechnicianId);
          if (techUser) techName = techUser.name;
        }
        
        ticket.assignedTechnicianId = assignedTechnicianId;
        ticket.notes.push({
          text: `Ticket assigned/claimed by ${techName}.`,
          author: 'System',
          type: 'system'
        });

        // Auto-update status to In Progress when claimed/assigned, unless already Closed or In Progress
        if (ticket.status !== 'In Progress' && ticket.status !== 'Closed') {
          status = 'In Progress';
          
          if (!ticket.lifecycleTimestamps?.inProgressAt) {
            ticket.lifecycleTimestamps = { ...ticket.lifecycleTimestamps, inProgressAt: new Date() };
          }
          
          ticket.notes.push({
            text: `Status automatically changed to In Progress upon assignment.`,
            author: 'System',
            type: 'system'
          });
        }
      } else if (!assignedTechnicianId && oldAssigned) {
        ticket.assignedTechnicianId = null;
        ticket.notes.push({
          text: `Ticket assignment released.`,
          author: 'System',
          type: 'system'
        });
      }
    }

    // Apply status update & SLA pause/resume clock mechanics
    if (status && status !== oldStatus) {
      // Access check: Client can only change status to Close or Closed
      if (req.user.role === 'Client' && status !== 'Closed') {
        return next(new AppError('Clients can only close their own tickets.', 403));
      }

      ticket.status = status;

      // 1. Entering "Waiting on Client" -> Pause the SLA targets clock
      if (status === 'Waiting on Client') {
        const reason = pauseReason || note || 'No reason provided';
        if (!reason || !reason.trim() || reason === 'No reason provided') {
          return next(new AppError('A reason is required to pause the SLA clock.', 400));
        }
        ticket.sla.pausedAt = new Date();
        ticket.pauseReason = reason.trim();
        ticket.lifecycleTimestamps = { ...ticket.lifecycleTimestamps, pendingAt: new Date() };
        ticket.notes.push({
          text: `SLA paused (Status: Waiting on Client). Reason: ${reason.trim()}`,
          author: req.user.name,
          type: 'system'
        });
      }

      // 2. Leaving "Waiting on Client" -> Resume clock and shift targets forward
      if (oldStatus === 'Waiting on Client' && ticket.sla.pausedAt) {
        const resumeAt = new Date();
        const deltaMinutes = calculatePauseDelta(ticket.priority, ticket.sla.pausedAt, resumeAt);

        if (deltaMinutes > 0) {
          if (ticket.sla.ackTarget) {
            ticket.sla.ackTarget = new Date(ticket.sla.ackTarget.getTime() + deltaMinutes * 60 * 1000);
          }
          if (ticket.sla.resolveTarget) {
            ticket.sla.resolveTarget = new Date(ticket.sla.resolveTarget.getTime() + deltaMinutes * 60 * 1000);
          }
          ticket.sla.pausedTotalMinutes = (ticket.sla.pausedTotalMinutes || 0) + deltaMinutes;
        }
        ticket.sla.pausedAt = null;
        ticket.pauseReason = null;
        ticket.notes.push({
          text: `SLA resumed. Status changed to ${status}. Paused for ${deltaMinutes} minutes.`,
          author: req.user.name,
          type: 'system'
        });
      }

      // 3. Resolving
      if (status === 'Resolved') {
        if (oldStatus === 'Waiting on Client') {
          return next(new AppError('Cannot resolve a ticket directly from a paused state. Please resume the ticket first.', 400));
        }

        const resNote = note;
        if (!resNote || !resNote.trim()) {
          return next(new AppError('A resolution note is required to resolve a ticket.', 400));
        }

        ticket.lifecycleTimestamps = { ...ticket.lifecycleTimestamps, resolvedAt: new Date() };
        ticket.notes.push({
          text: `Ticket resolved. Resolution Notes: ${resNote.trim()}`,
          author: req.user.name,
          type: 'system'
        });
      }
      
      // 4. Closing
      if (status === 'Closed') {
        ticket.lifecycleTimestamps = { ...ticket.lifecycleTimestamps, closedAt: new Date() };
      }
    }

    // Add manual note if provided and not already logged as part of status transition
    if (note && note.trim() && status !== 'Waiting on Client' && status !== 'Resolved') {
      ticket.notes.push({
        text: note.trim(),
        author: req.user.name,
        type: 'technician'
      });
    }

    // Recalculate priority if priority matrix changed
    if (matrix && (matrix.impact !== ticket.matrix.impact || matrix.urgency !== ticket.matrix.urgency)) {
      if (req.user.role === 'Technician') {
        if (ticket.assignedTechnicianId && !assignedTechnicianId) {
          // If it's already assigned and they aren't claiming it in this request
          return next(new AppError('Technicians can only change priority before claiming the ticket.', 403));
        }
        if (ticket.hasTechChangedPriority) {
          return next(new AppError('Technicians can only change the priority once.', 403));
        }
        ticket.hasTechChangedPriority = true;
      }

      const oldPriority = ticket.priority;
      ticket.matrix = matrix;
      // Re-trigger pre-save hook priority calculation
      const impact = matrix.impact;
      const urgency = matrix.urgency;
      let calculatedPriority = 'P3';
      if (impact === 3 && urgency === 3) calculatedPriority = 'P1';
      else if ((impact === 3 && urgency === 2) || (impact === 2 && urgency === 3)) calculatedPriority = 'P2';
      else if ((impact === 2 && urgency === 2) || (impact === 1 && urgency === 3)) calculatedPriority = 'P3';
      else calculatedPriority = 'P4';

      ticket.priority = calculatedPriority;

      // Audit trail: log the priority change
      ticket.notes.push({
        text: `Priority changed from ${oldPriority} to ${calculatedPriority} by ${req.user.name}.`,
        author: 'System',
        type: 'system'
      });

      // Update SLA targets for the new priority
      const client = await Client.findById(ticket.clientId);
      if (client) {
        const slaTargets = calculateSlaTargets(calculatedPriority, ticket.createdAt, client.sla);
        ticket.sla.ackTarget = slaTargets.ackTarget;
        ticket.sla.resolveTarget = slaTargets.resolveTarget;
      }
    }

    await ticket.save();

    // Re-populate references so the response is fully populated
    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('clientId', 'name')
      .populate('assignedTechnicianId', 'name email')
      .populate('queueId', 'name color');

    res.status(200).json({
      status: 'success',
      data: {
        ticket: populatedTicket
      }
    });
  } catch (error) {
    next(error);
  }
};
