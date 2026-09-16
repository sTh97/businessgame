const mongoose = require('mongoose');

const levelSchema = new mongoose.Schema({
  _id: { type: String },
  industry: { type: String, required: true },
  level: { type: Number, required: true },
  phase: { type: String, required: true },
  unlockedMechanics: { type: [String], default: [] },
  eventPoolIds: { type: [String], default: [] }
});

levelSchema.index({ industry: 1, level: 1 }, { unique: true });

module.exports = mongoose.model('Level', levelSchema);
