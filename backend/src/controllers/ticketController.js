import Ticket from '../models/Ticket.js';
import Client from '../models/Client.js';
import { AppError } from '../middlewares/error.js';
import { calculateSlaTargets, calculatePauseDelta } from '../services/slaEngine.js';

/**
 * Get all tickets (filtered by role constraints)
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
    }

    // Support query filtering
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;

    const tickets = await Ticket.find(filter)
      .populate('clientId', 'name')
      .populate('assignedTechnicianId', 'name email')
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
      .populate('assignedTechnicianId', 'name email');

    if (!ticket) {
      return next(new AppError('No ticket found with that ID', 404));
    }

    // Access check: Clients can only access their own company's tickets
    if (req.user.role === 'Client' && ticket.clientId._id.toString() !== req.user.clientId.toString()) {
      return next(new AppError('You do not have permission to access this ticket.', 403));
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

    // Create instance to run pre-save hook (which calculates priority)
    const ticket = new Ticket({
      clientId,
      subject,
      description,
      matrix,
      attachments,
      status: 'New'
    });

    // Run priority evaluation pre-save hook logic manually to generate targets
    // before the actual save, or save it and let hook calculate.
    // Wait, the hook runs pre-save. To calculate targets properly, we should
    // let it calculate priority, then run calculation, or do it on pre-save hook in model!
    // Since ticket.priority is calculated on pre-save, we can calculate SLA targets inside the pre-save hook in Ticket.js, OR calculate it right here.
    // To keep it simple and clean, let's calculate priority manually here, then calculate targets and save.
    
    const impact = matrix?.impact || 2;
    const urgency = matrix?.urgency || 2;
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
    const { status, assignedTechnicianId, subject, description, matrix, attachments } = req.body;
    
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

    // Technicians & Admins can assign staff
    if (req.user.role !== 'Client' && assignedTechnicianId !== undefined) {
      ticket.assignedTechnicianId = assignedTechnicianId || null;
      // Auto-update status to In Progress if currently New and assigned
      if (assignedTechnicianId && ticket.status === 'New') {
        ticket.status = 'In Progress';
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
        ticket.sla.pausedAt = new Date();
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
      }
    }

    // Recalculate priority if priority matrix changed
    if (matrix && (matrix.impact !== ticket.matrix.impact || matrix.urgency !== ticket.matrix.urgency)) {
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

      // Update SLA targets for the new priority
      const client = await Client.findById(ticket.clientId);
      if (client) {
        const slaTargets = calculateSlaTargets(calculatedPriority, ticket.createdAt, client.sla);
        ticket.sla.ackTarget = slaTargets.ackTarget;
        ticket.sla.resolveTarget = slaTargets.resolveTarget;
      }
    }

    await ticket.save();

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
