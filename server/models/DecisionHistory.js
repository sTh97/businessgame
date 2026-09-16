const mongoose = require('mongoose');

const decisionHistorySchema = new mongoose.Schema({
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
  level: { type: Number, required: true },
  eventId: String,
  eventTitle: String,
  decisionId: String,
  decisionLabel: String,
  resolvedAt: { type: Date, default: Date.now },
  immediateOutcome: { type: Object, default: {} },
  financialImpact: { type: Object, default: {} },
  randomResolutions: { type: Array, default: [] },
  delayed: { type: Array, default: [] },
  result: { type: Object, default: {} },
  idempotencyKey: { type: String, required: true }
});

decisionHistorySchema.index({ gameId: 1, level: 1 });
decisionHistorySchema.index({ idempotencyKey: 1 }, { unique: true });

module.exports = mongoose.model('DecisionHistory', decisionHistorySchema);
