const mongoose = require('mongoose');

const financialHistorySchema = new mongoose.Schema({
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
  period: { type: String, required: true },
  gameMonth: Number,
  level: Number,
  revenue: Number,
  operatingExpenses: Number,
  operatingProfit: Number,
  interest: Number,
  taxes: Number,
  exceptionalLosses: { type: Number, default: 0 },
  netProfit: Number,
  cashBalance: Number,
  companyValuation: Number
});

financialHistorySchema.index({ gameId: 1, period: 1 }, { unique: true });

module.exports = mongoose.model('FinancialHistory', financialHistorySchema);
