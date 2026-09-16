const mongoose = require('mongoose');

const loginHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    loggedInAt: { type: Date, required: true, default: Date.now },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' }
  },
  { timestamps: false }
);

loginHistorySchema.index({ loggedInAt: -1 });
loginHistorySchema.index({ userId: 1, loggedInAt: -1 });

module.exports = mongoose.model('LoginHistory', loginHistorySchema);
