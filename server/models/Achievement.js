const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  _id: { type: String },
  title: { type: String, required: true },
  description: String,
  condition: { type: Object, required: true }
});

module.exports = mongoose.model('Achievement', achievementSchema);
