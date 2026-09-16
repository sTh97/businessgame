const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true, index: true },
  personId: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, required: true },
  title: String,
  professionalism: { type: Number, default: 55 },
  salary: { type: Number, default: 0 },
  morale: { type: Number, default: 65 },
  skill: { type: Number, default: 55 },
  productivity: { type: Number, default: 65 },
  isManager: { type: Boolean, default: false },
  assignedProjectId: { type: String, default: null },
  assignedRoomId: { type: String, default: null },
  taskBurndown: {
    assigned: { type: Number, default: 0 },
    remaining: { type: Number, default: 0 }
  },
  status: { type: String, default: 'active' }
});

employeeSchema.index({ gameId: 1, personId: 1 }, { unique: true });

module.exports = mongoose.model('Employee', employeeSchema);
