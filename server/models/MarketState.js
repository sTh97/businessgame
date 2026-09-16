const mongoose = require('mongoose');

const marketStateSchema = new mongoose.Schema({
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
  asOfLevel: { type: Number, required: true },
  marketGrowth: Number,
  inflation: Number,
  interestRate: Number,
  consumerDemand: Number,
  competitionIntensity: Number,
  economicCondition: { type: String, default: 'normal' },
  technologyTrend: String,
  conditionRemaining: { type: Number, default: 0 },
  competitors: { type: Array, default: [] },
  intel: { type: Object, default: {} }
});

marketStateSchema.index({ gameId: 1, asOfLevel: 1 });

module.exports = mongoose.model('MarketState', marketStateSchema);
