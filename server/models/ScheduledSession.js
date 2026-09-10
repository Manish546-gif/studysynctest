const mongoose = require('mongoose');

const scheduledSessionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scheduledAt: { type: Date, required: true },
  durationMinutes: { type: Number, default: 60 },
  invitees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  color: { type: String, default: '#53fc18' },
}, { timestamps: true });

scheduledSessionSchema.index({ createdBy: 1 });
scheduledSessionSchema.index({ invitees: 1 });
scheduledSessionSchema.index({ scheduledAt: 1 });

module.exports = mongoose.model('ScheduledSession', scheduledSessionSchema);
