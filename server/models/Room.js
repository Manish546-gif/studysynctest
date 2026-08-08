const mongoose = require('mongoose');
const { drawActionSchema } = require('./schemas');

const messageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, default: '' },
  avatar: { type: String, default: '' },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const fileSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  storedName: { type: String, required: true },
  mimeType: { type: String, default: '' },
  size: { type: Number, default: 0 },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedByName: { type: String, default: '' },
  url: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  tag: { type: String, default: 'Study' },
  cover: { type: String, default: '' },
  whiteboardActions: [drawActionSchema],
  messages: [messageSchema],
  files: [fileSchema],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

roomSchema.index({ host: 1 });
roomSchema.index({ members: 1 });
roomSchema.index({ code: 1 }, { unique: true });

roomSchema.statics.generateCode = async function () {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  let exists = true;
  while (exists) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    exists = !!(await this.findOne({ code }));
  }
  return code;
};

module.exports = mongoose.model('Room', roomSchema);
