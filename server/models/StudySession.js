const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date, default: null },
  duration: { type: Number, default: 0 }, // seconds
  type: { type: String, enum: ['room', 'whiteboard', 'pomodoro'], default: 'room' },
  pomodoroSessions: { type: Number, default: 0 },
}, { timestamps: true });

studySessionSchema.index({ user: 1 });
studySessionSchema.index({ user: 1, startTime: -1 });

module.exports = mongoose.model('StudySession', studySessionSchema);
