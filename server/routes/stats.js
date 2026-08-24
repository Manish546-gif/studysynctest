const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const StudySession = require('../models/StudySession');
const Room = require('../models/Room');
const User = require('../models/User');

// Record a study session
router.post('/sessions', auth, async (req, res) => {
  try {
    const { room, type, duration, pomodoroSessions } = req.body;
    const session = await StudySession.create({
      user: req.user._id,
      room: room || null,
      type: type || 'room',
      duration: duration || 0,
      pomodoroSessions: pomodoroSessions || 0,
      endTime: new Date(),
    });
    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user stats
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Total study time (all time)
    const allTime = await StudySession.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, total: { $sum: '$duration' }, count: { $sum: 1 } } },
    ]);

    // This week
    const thisWeek = await StudySession.aggregate([
      { $match: { user: userId, startTime: { $gte: weekAgo } } },
      { $group: { _id: null, total: { $sum: '$duration' }, count: { $sum: 1 } } },
    ]);

    // Today
    const todaySessions = await StudySession.aggregate([
      { $match: { user: userId, startTime: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$duration' }, count: { $sum: 1 } } },
    ]);

    // Daily breakdown for last 7 days
    const daily = await StudySession.aggregate([
      { $match: { user: userId, startTime: { $gte: weekAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } },
          total: { $sum: '$duration' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Streak: consecutive days with study sessions
    const recentSessions = await StudySession.find({ user: userId })
      .sort({ startTime: -1 })
      .limit(365)
      .select('startTime');

    let streak = 0;
    const todayStr = today.toISOString().split('T')[0];
    const dayMs = 24 * 60 * 60 * 1000;
    const sessionDays = new Set(
      recentSessions.map((s) => new Date(s.startTime).toISOString().split('T')[0])
    );

    let checkDate = new Date(today);
    if (!sessionDays.has(todayStr)) {
      checkDate = new Date(today.getTime() - dayMs);
    }
    while (sessionDays.has(checkDate.toISOString().split('T')[0])) {
      streak++;
      checkDate = new Date(checkDate.getTime() - dayMs);
    }

    // Pomodoro sessions total
    const pomodoroTotal = await StudySession.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, total: { $sum: '$pomodoroSessions' } } },
    ]);

    // Most active rooms
    const topRooms = await StudySession.aggregate([
      { $match: { user: userId, room: { $ne: null } } },
      { $group: { _id: '$room', total: { $sum: '$duration' } } },
      { $sort: { total: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'rooms',
          localField: '_id',
          foreignField: '_id',
          as: 'room',
        },
      },
      { $unwind: '$room' },
      { $project: { name: '$room.name', total: 1 } },
    ]);

    res.json({
      allTime: { total: allTime[0]?.total || 0, sessions: allTime[0]?.count || 0 },
      thisWeek: { total: thisWeek[0]?.total || 0, sessions: thisWeek[0]?.count || 0 },
      today: { total: todaySessions[0]?.total || 0, sessions: todaySessions[0]?.count || 0 },
      streak,
      pomodoroSessions: pomodoroTotal[0]?.total || 0,
      daily,
      topRooms,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get public rooms
router.get('/public-rooms', async (req, res) => {
  try {
    const { subject, search, page = 1 } = req.query;
    const limit = 20;
    const filter = { isPublic: true, isActive: true };
    if (subject) filter.subject = subject;
    if (search) filter.name = { $regex: search, $options: 'i' };
    const rooms = await Room.find(filter)
      .populate('host', 'name avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await Room.countDocuments(filter);
    res.json({ rooms, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
