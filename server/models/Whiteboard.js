const mongoose = require('mongoose');
const { drawActionSchema } = require('./schemas');

const whiteboardSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  notebook: { type: mongoose.Schema.Types.ObjectId, ref: 'Notebook', default: null },
  actions: [drawActionSchema],
}, { timestamps: true });

whiteboardSchema.index({ owner: 1 });
whiteboardSchema.index({ sharedWith: 1 });

module.exports = mongoose.model('Whiteboard', whiteboardSchema);
