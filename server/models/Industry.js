const mongoose = require('mongoose');

const industrySchema = new mongoose.Schema({
  _id: { type: String },
  name: String,
  tagline: String,
  description: String,
  locked: { type: Boolean, default: false },
  release: { type: Number, default: 1 },
  industryConfig: { type: Object, required: true }
});

module.exports = mongoose.model('Industry', industrySchema);
