const mongoose = require('mongoose');

const STATUSES = ['initializing', 'active', 'completed', 'failed', 'abandoned'];
const DIFFICULTIES = ['easy', 'normal', 'hard', 'expert'];

const gameSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    industry: { type: String, required: true },
    difficulty: { type: String, required: true, enum: DIFFICULTIES },
    companyName: { type: String, required: true },
    founderName: { type: String, required: true },
    status: { type: String, required: true, enum: STATUSES, default: 'initializing' },
    currentLevel: { type: Number, default: 1 },
    gameStateVersion: { type: Number, default: 1 },
    difficultyModifiers: { type: Object, required: true },
    score: { type: Number, default: 0 },
    ending: { type: Object },
    seenEventIds: { type: [String], default: [] },
    criticalUsed: { type: Boolean, default: false }
  },
  { timestamps: true }
);

gameSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Game', gameSchema);
