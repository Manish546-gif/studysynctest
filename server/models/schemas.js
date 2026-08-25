const mongoose = require('mongoose');

const drawActionSchema = new mongoose.Schema({
  tool: { type: String, required: true },
  points: [{ x: Number, y: Number, pressure: Number }],
  color: { type: String, default: '#000000' },
  strokeWidth: { type: Number, default: 2 },
  text: { type: String },
  x: { type: Number },
  y: { type: Number },
  x1: { type: Number },
  y1: { type: Number },
  x2: { type: Number },
  y2: { type: Number },
  w: { type: Number },
  h: { type: Number },
  fill: { type: String },
  stroke: { type: String },
  src: { type: String },
  fontSize: { type: Number },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actionId: { type: String },
  timestamp: { type: Date, default: Date.now },
}, { _id: true });

module.exports = { drawActionSchema };
