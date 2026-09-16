const mongoose = require('mongoose');

const decisionSchema = new mongoose.Schema({
  _id: { type: String },
  eventId: { type: String, required: true, index: true },
  label: { type: String, required: true },
  summary: { type: String, default: '' },
  tone: { type: String, default: 'neutral' },
  durationMonths: { type: Number, default: 1 },
  directEffects: { type: Object, default: {} },
  industryDirectEffects: { type: Object, default: {} },
  conditionalEffects: { type: Array, default: [] },
  probabilityEffects: { type: Array, default: [] },
  hiddenEffects: { type: Object, default: {} },
  delayedEffects: { type: Array, default: [] },
  workforceEffects: { type: Object, default: {} },
  projectEffects: { type: Object, default: {} },
  setFlags: { type: Object, default: {} },
  setProperty: { type: Object, default: {} },
  professionalismDelta: { type: Number }
});

module.exports = mongoose.model('Decision', decisionSchema);
