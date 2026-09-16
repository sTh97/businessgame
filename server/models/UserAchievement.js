const mongoose = require('mongoose');

const userAchievementSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
  achievementId: { type: String, required: true },
  unlockedAt: { type: Date, default: Date.now }
});

userAchievementSchema.index({ userId: 1, gameId: 1 });
userAchievementSchema.index({ gameId: 1, achievementId: 1 }, { unique: true });

module.exports = mongoose.model('UserAchievement', userAchievementSchema);
