const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
  projectName: { type: String, required: true },
  client: String,
  contractValue: Number,
  cost: Number,
  duration: Number,
  remaining: Number,
  requiredCapacity: Number,
  risk: Number,
  qualityRequirement: Number,
  deadlineMonth: Number,
  paymentTerms: String,
  status: {
    type: String,
    enum: ['opportunity', 'negotiation', 'won', 'in-progress', 'delayed', 'completed', 'failed', 'cancelled'],
    default: 'in-progress'
  },
  createdLevel: Number
});

projectSchema.index({ gameId: 1, status: 1 });

module.exports = mongoose.model('Project', projectSchema);
