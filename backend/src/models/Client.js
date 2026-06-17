import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a client/company name'],
    unique: true,
    trim: true
  },
  domains: {
    type: [String],
    default: [],
    lowercase: true,
    trim: true
  },
  contactEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  contactPhone: {
    type: String,
    trim: true
  },
  address: {
    type: String
  },
  sla: {
    p1: {
      ackTarget: { type: Number, default: 15 }, // in minutes
      resolveTarget: { type: Number, default: 120 } // in minutes (2 hours)
    },
    p2: {
      ackTarget: { type: Number, default: 60 }, // in minutes
      resolveTarget: { type: Number, default: 480 } // in minutes (8 business hours)
    },
    p3: {
      ackTarget: { type: Number, default: 120 }, // in minutes
      resolveTarget: { type: Number, default: 1440 } // in minutes (24 business hours)
    },
    p4: {
      ackTarget: { type: Number, default: 240 }, // in minutes
      resolveTarget: { type: Number, default: 2880 } // in minutes (48 business hours)
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Client = mongoose.models.Client || mongoose.model('Client', clientSchema);
export default Client;
