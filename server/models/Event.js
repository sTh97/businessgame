const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  _id: { type: String },
  industry: { type: String, required: true },
  phaseEligible: { type: [String], required: true },
  category: { type: String, required: true },
  title: { type: String, required: true },
  narrative: { type: String, required: true },
  eligibility: { type: Object, default: {} },
  decisionIds: { type: [String], required: true },
  once: { type: Boolean, default: false },
  weight: { type: Number, default: 1 },
  minLevel: { type: Number, default: 1 },
  maxLevel: { type: Number, default: 100 },
  eventPoolIds: { type: [String], default: [] },
  isCritical: { type: Boolean, default: false }
});

eventSchema.index({ industry: 1, category: 1 });
eventSchema.index({ industry: 1, phaseEligible: 1, category: 1 });

module.exports = mongoose.model('Event', eventSchema);
