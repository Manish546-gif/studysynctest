const mongoose = require('mongoose');

const drawActionSchema = new mongoose.Schema({
  type: { type: String, required: true },
  points: [{ x: Number, y: Number }],
  color: { type: String, default: '#000000' },
  strokeWidth: { type: Number, default: 2 },
  text: { type: String },
  x: { type: Number },
  y: { type: Number },
  w: { type: Number },
  h: { type: Number },
  fill: { type: String },
  stroke: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actionId: { type: String },
  timestamp: { type: Date, default: Date.now },
}, { _id: true });

module.exports = { drawActionSchema };
