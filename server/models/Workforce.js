const mongoose = require('mongoose');

const workforceSchema = new mongoose.Schema({
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
  role: { type: String, required: true },
  title: String,
  count: { type: Number, default: 0 },
  avgSkill: { type: Number, default: 50 },
  avgMorale: { type: Number, default: 60 },
  avgProductivity: { type: Number, default: 65 },
  unitSalary: { type: Number, default: 0 },
  totalSalary: { type: Number, default: 0 }
});

workforceSchema.index({ gameId: 1, role: 1 }, { unique: true });

module.exports = mongoose.model('Workforce', workforceSchema);
