import mongoose from 'mongoose';

const queueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Queue name is required'],
    trim: true,
    unique: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  color: {
    type: String,
    default: '#6b7280' // default gray
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Queue = mongoose.models.Queue || mongoose.model('Queue', queueSchema);
export default Queue;
