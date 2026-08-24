const mongoose = require('mongoose');
const { drawActionSchema } = require('./schemas');

const sharedWithSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['editor', 'viewer'], default: 'editor' },
  },
  { _id: false }
);

const commentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, default: '' },
    text: { type: String, required: true, maxlength: 2000 },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const whiteboardSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sharedWith: [sharedWithSchema],
  linkAccess: { type: String, enum: ['none', 'view', 'edit'], default: 'none' },
  notebook: { type: mongoose.Schema.Types.ObjectId, ref: 'Notebook', default: null },
  actions: [drawActionSchema],
  comments: [commentSchema],
}, { timestamps: true });

whiteboardSchema.index({ owner: 1 });
whiteboardSchema.index({ 'sharedWith.user': 1 });

module.exports = mongoose.model('Whiteboard', whiteboardSchema);
