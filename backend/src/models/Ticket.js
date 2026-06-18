import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
  ticketId: { type: String, unique: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  assignedTechnicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  status: {
    type: String,
    enum: ['New', 'In Progress', 'Waiting on Client', 'Resolved', 'Closed'],
    default: 'New'
  },
  priority: {
    type: String,
    enum: ['P1', 'P2', 'P3', 'P4']
  },
  matrix: {
    impact: { type: Number, required: true, min: 1, max: 3 },
    urgency: { type: Number, required: true, min: 1, max: 3 }
  },
  hasTechChangedPriority: { type: Boolean, default: false },
  queueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Queue',
    default: null
  },
  sla: {
    ackTarget: { type: Date },
    resolveTarget: { type: Date },
    ackBreached: { type: Boolean, default: false },
    resolveBreached: { type: Boolean, default: false },
    pausedAt: { type: Date },
    pausedTotalMinutes: { type: Number, default: 0 }
  },
  pauseReason: { type: String },
  lifecycleTimestamps: {
    inProgressAt: { type: Date },
    pendingAt: { type: Date },
    resolvedAt: { type: Date },
    closedAt: { type: Date }
  },
  notes: [{
    text: { type: String, required: true },
    author: { type: String, required: true },
    type: { type: String, enum: ['system', 'technician'], default: 'technician' },
    createdAt: { type: Date, default: Date.now }
  }],
  attachments: [{
    fileId: { type: mongoose.Schema.Types.ObjectId },
    filename: { type: String },
    contentType: { type: String }
  }]
}, {
  timestamps: true
});

// Auto-increment ticketId and calculate priority before saving
ticketSchema.pre('save', async function(next) {
  const ticket = this;

  // 1. Calculate Priority based on Matrix (server-side evaluation)
  const impact = ticket.matrix?.impact;
  const urgency = ticket.matrix?.urgency;
  if (impact !== undefined && urgency !== undefined) {
    if (impact === 3 && urgency === 3) {
      ticket.priority = 'P1';
    } else if ((impact === 3 && urgency === 2) || (impact === 2 && urgency === 3)) {
      ticket.priority = 'P2';
    } else if ((impact === 2 && urgency === 2) || (impact === 1 && urgency === 3)) {
      ticket.priority = 'P3';
    } else {
      ticket.priority = 'P4';
    }
  }

  // 2. Auto-increment ticketId (Format: INC-1001, INC-1002...)
  if (!ticket.ticketId) {
    try {
      const lastTicket = await mongoose.model('Ticket').findOne({}, {}, { sort: { 'createdAt': -1 } });
      let nextNum = 1001;
      if (lastTicket && lastTicket.ticketId) {
        const match = lastTicket.ticketId.match(/INC-(\d+)/);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }
      ticket.ticketId = `INC-${nextNum}`;
    } catch (err) {
      return next(err);
    }
  }

  next();
});

const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);
export default Ticket;
