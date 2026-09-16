const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    lastLoginAt: { type: Date },
    lastSeenAt: { type: Date },
    loginCount: { type: Number, default: 0 },
    timeSpentMs: { type: Number, default: 0 }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('User', userSchema);
