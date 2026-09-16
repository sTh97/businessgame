const mongoose = require('mongoose');

const pendingConsequenceSchema = new mongoose.Schema(
  {
    sourceDecisionId: String,
    label: String,
    triggerLevel: Number,
    triggerMonth: Number,
    probability: Number,
    eventPool: String,
    effects: Object,
    hidden: { type: Boolean, default: false }
  },
  { _id: false }
);

const gameStateSchema = new mongoose.Schema({
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true, unique: true },
  version: { type: Number, required: true },
  level: { type: Number, required: true },
  gameMonth: { type: Number, required: true, default: 1 },
  state: { type: Object, required: true },
  industryState: { type: Object, default: {} },
  pendingConsequences: { type: [pendingConsequenceSchema], default: [] },
  currentEvent: {
    eventId: String,
    status: { type: String, enum: ['pending', 'resolved', 'none'], default: 'pending' }
  },
  score: { type: Number, default: 0 },
  lastOutcome: { type: Object },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GameState', gameStateSchema);
