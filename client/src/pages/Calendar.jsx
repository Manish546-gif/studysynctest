import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Clock, Users, ArrowRight,
  Plus, X, CalendarDays, Bell, Trash2, Edit3, Loader2,
} from 'lucide-react'
import { api } from '../services/api'
import Skeleton from '../components/common/Skeleton'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

const SESSION_COLORS = [
  '#53fc18', '#3d8bff', '#a78bfa', '#f472b6', '#ff9f43', '#ff4f4f', '#22d3ee', '#fbbf24',
]

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function formatCountdown(date) {
  const diff = new Date(date).getTime() - Date.now()
  if (diff <= 0) return 'Starting now'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (days > 0) return `in ${days}d ${hours}h`
  if (hours > 0) return `in ${hours}h ${mins}m`
  return `in ${mins}m`
}

function ScheduleModal({ isOpen, onClose, onSave, rooms }) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [duration, setDuration] = useState(60)
  const [roomId, setRoomId] = useState('')
  const [color, setColor] = useState('#53fc18')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const handleSave = async () => {
    if (!title.trim() || !date) { setErr('Title and date are required'); return }
    setSaving(true); setErr('')
    try {
      const scheduledAt = new Date(`${date}T${time}`)
      const data = await api.createSession({
        title: title.trim(),
        scheduledAt: scheduledAt.toISOString(),
        durationMinutes: duration,
        roomId: roomId || undefined,
        color,
      })
      onSave(data.session)
      onClose()
    } catch (e) { setErr(e.message) }
    setSaving(false)
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-md rounded-2xl border border-[#2a2d33] shadow-2xl overflow-hidden"
        style={{ background: '#16191e' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d33]">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-[#53fc18]" />
            <h3 className="text-sm font-bold text-[#e8eaed]">Schedule Session</h3>
          </div>
          <button onClick={onClose} className="text-[#9b9e9e] hover:text-[#e8eaed] transition-colors"><X size={15} /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-[#9b9e9e] uppercase tracking-wider">Title</label>
            <input
              type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Calculus Study Group"
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-[#0e0f13] border border-[#2a2d33] text-sm text-[#e8eaed] placeholder-[#9b9e9e]/50 focus:outline-none focus:border-[#53fc18] transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-[#9b9e9e] uppercase tracking-wider">Date</label>
              <input
                type="date" value={date} onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-[#0e0f13] border border-[#2a2d33] text-sm text-[#e8eaed] focus:outline-none focus:border-[#53fc18] transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#9b9e9e] uppercase tracking-wider">Time</label>
              <input
                type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-[#0e0f13] border border-[#2a2d33] text-sm text-[#e8eaed] focus:outline-none focus:border-[#53fc18] transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-[#9b9e9e] uppercase tracking-wider">Duration (min)</label>
              <input
                type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))}
                min={15} max={480} step={15}
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-[#0e0f13] border border-[#2a2d33] text-sm text-[#e8eaed] focus:outline-none focus:border-[#53fc18] transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#9b9e9e] uppercase tracking-wider">Color</label>
              <div className="mt-1.5 flex gap-1.5 flex-wrap">
                {SESSION_COLORS.slice(0, 6).map(c => (
                  <button key={c} onClick={() => setColor(c)}
                    className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                    style={{ background: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }}
                  />
                ))}
              </div>
            </div>
          </div>

          {rooms.length > 0 && (
            <div>
              <label className="text-[10px] font-bold text-[#9b9e9e] uppercase tracking-wider">Link to Room (optional)</label>
              <select
                value={roomId} onChange={(e) => setRoomId(e.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-[#0e0f13] border border-[#2a2d33] text-sm text-[#e8eaed] focus:outline-none focus:border-[#53fc18] transition-colors"
              >
                <option value="">None</option>
                {rooms.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
              </select>
            </div>
          )}

          {err && <p className="text-xs text-red-400">{err}</p>}

          <button onClick={handleSave} disabled={saving}
            className="w-full py-2.5 rounded-xl text-sm font-bold bg-[#53fc18] text-black flex items-center justify-center gap-2 hover:bg-[#48de13] transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CalendarDays size={14} />}
            {saving ? 'Scheduling…' : 'Schedule Session'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Calendar() {
  const navigate = useNavigate()
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDay, setSelectedDay] = useState(today.getDate())
  const [rooms, setRooms] = useState([])
  const [pastSessions, setPastSessions] = useState([])
  const [scheduledSessions, setScheduledSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSchedule, setShowSchedule] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [roomsData, sessionsData] = await Promise.all([
        api.getRooms().catch(() => ({ rooms: [] })),
        api.getSessions().catch(() => ({ sessions: [] })),
      ])
      setRooms(roomsData.rooms || [])
      const now = new Date()
      const sessions = sessionsData.sessions || []
      setScheduledSessions(sessions.filter(s => new Date(s.scheduledAt) >= now))
      setPastSessions(roomsData.rooms || [])
    } catch (_) {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Notify 5 min before scheduled sessions
  useEffect(() => {
    const timers = scheduledSessions.map((s) => {
      const diff = new Date(s.scheduledAt).getTime() - Date.now() - 5 * 60 * 1000
      if (diff <= 0 || diff > 10 * 60 * 1000) return null
      return setTimeout(() => {
        if (Notification.permission === 'granted') {
          new Notification(`Session starting in 5 min: ${s.title}`, {
            body: s.roomId?.name ? `Room: ${s.roomId.name}` : 'Get ready!',
            icon: '/favicon.ico',
          })
        }
      }, diff)
    }).filter(Boolean)
    return () => timers.forEach(clearTimeout)
  }, [scheduledSessions])

  // Build calendar entries combining past rooms + scheduled
  const allEvents = [
    ...pastSessions.map((room, i) => {
      const d = new Date(room.createdAt || room.updatedAt)
      return {
        day: d.getDate(), month: d.getMonth(), year: d.getFullYear(),
        type: 'past', title: room.name, roomId: room._id,
        updatedAt: room.updatedAt, attendees: room.members?.length || 0,
        color: SESSION_COLORS[i % SESSION_COLORS.length],
      }
    }),
    ...scheduledSessions.map((s) => {
      const d = new Date(s.scheduledAt)
      return {
        day: d.getDate(), month: d.getMonth(), year: d.getFullYear(),
        type: 'scheduled', title: s.title, sessionId: s._id,
        scheduledAt: s.scheduledAt, duration: s.durationMinutes,
        roomId: s.roomId?._id, color: s.color || '#53fc18',
      }
    }),
  ]

  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const prevMonth = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) } else setCurrentMonth(m => m - 1) }
  const nextMonth = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) } else setCurrentMonth(m => m + 1) }

  const getEventsForDay = (day) => allEvents.filter(e => e.day === day && e.month === currentMonth && e.year === currentYear)
  const selectedEvents = getEventsForDay(selectedDay)

  const calendarDays = []
  for (let i = 0; i < firstDay; i++) calendarDays.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d)

  const deleteScheduled = async (id) => {
    try {
      await api.deleteSession(id)
      setScheduledSessions(prev => prev.filter(s => s._id !== id))
    } catch (_) {}
  }

  // Upcoming sessions for sidebar
  const upcoming = scheduledSessions
    .filter(s => new Date(s.scheduledAt) > Date.now())
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
    .slice(0, 5)

  return (
    <div className="min-h-screen bg-[#0e0f13] text-[#e8eaed] p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e8eaed]">Calendar</h1>
          <p className="text-sm text-[#9b9e9e] mt-1">Sessions and scheduled study blocks</p>
        </div>
        <button
          onClick={() => setShowSchedule(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#53fc18] text-black text-sm font-bold hover:bg-[#48de13] transition-colors shadow-md"
        >
          <Plus size={15} />
          Schedule Session
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-[#16191e] rounded-2xl border border-[#2a2d33] p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#e8eaed]">{MONTHS[currentMonth]} {currentYear}</h2>
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="w-9 h-9 rounded-xl flex items-center justify-center text-[#9b9e9e] hover:text-[#e8eaed] hover:bg-[#20242b] transition-colors">
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); setSelectedDay(today.getDate()) }}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#9b9e9e] hover:text-[#e8eaed] hover:bg-[#20242b] transition-colors">
                Today
              </button>
              <button onClick={nextMonth} className="w-9 h-9 rounded-xl flex items-center justify-center text-[#9b9e9e] hover:text-[#e8eaed] hover:bg-[#20242b] transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map(d => <div key={d} className="text-center text-[11px] font-bold text-[#9b9e9e] uppercase py-2 tracking-wider">{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />
              const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()
              const isSelected = day === selectedDay
              const events = getEventsForDay(day)
              const hasPast = events.some(e => e.type === 'past')
              const hasScheduled = events.some(e => e.type === 'scheduled')

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`relative h-12 rounded-xl flex flex-col items-center justify-center text-sm font-semibold transition-all ${
                    isSelected ? 'bg-[#53fc18] text-black font-extrabold shadow-[0_0_12px_rgba(83,252,24,0.3)] scale-105'
                    : isToday ? 'bg-[#53fc18]/20 text-[#53fc18] border border-[#53fc18]/40'
                    : 'text-[#e8eaed] hover:bg-[#20242b]'
                  }`}
                >
                  {day}
                  <div className="absolute bottom-1.5 flex gap-0.5">
                    {hasPast && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-black' : 'bg-[#9b9e9e]'}`} />}
                    {hasScheduled && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-black' : 'bg-[#53fc18]'}`} />}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-4 pt-4 border-t border-[#2a2d33]">
            <div className="flex items-center gap-1.5 text-xs text-[#9b9e9e]">
              <div className="w-2 h-2 rounded-full bg-[#9b9e9e]" /> Past session
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#9b9e9e]">
              <div className="w-2 h-2 rounded-full bg-[#53fc18]" /> Scheduled
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex flex-col gap-4">
          {/* Selected day */}
          <div className="bg-[#16191e] rounded-2xl border border-[#2a2d33] p-5 shadow-xl flex-1">
            <h3 className="text-xs font-bold text-[#9b9e9e] uppercase tracking-wider mb-4">
              {MONTHS[currentMonth]} {selectedDay}, {currentYear}
            </h3>
            {loading ? (
              <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
            ) : selectedEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#0e0f13] border border-[#2a2d33] flex items-center justify-center mb-3">
                  <Clock size={20} className="text-[#9b9e9e]/40" />
                </div>
                <p className="text-sm font-semibold text-[#9b9e9e]">Nothing here</p>
                <p className="text-xs text-[#9b9e9e]/50 mt-1">Schedule a session!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map((ev, i) => (
                  <motion.div key={ev.sessionId || ev.roomId || i}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="p-3.5 rounded-xl bg-[#0e0f13] border border-[#2a2d33] space-y-2"
                    style={{ borderLeftColor: ev.color, borderLeftWidth: 3 }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-bold mb-1 ${ev.type === 'scheduled' ? 'bg-[#53fc18]/15 text-[#53fc18] border border-[#53fc18]/30' : 'bg-[#2a2d33] text-[#9b9e9e]'}`}>
                          {ev.type === 'scheduled' ? '📅 Scheduled' : 'Past Session'}
                        </span>
                        <h4 className="text-sm font-bold text-[#e8eaed]">{ev.title}</h4>
                      </div>
                      {ev.type === 'scheduled' && (
                        <button onClick={() => deleteScheduled(ev.sessionId)} className="text-[#9b9e9e]/40 hover:text-red-400 transition-colors p-1">
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                    {ev.type === 'scheduled' ? (
                      <div className="flex items-center gap-1 text-xs text-[#53fc18] font-semibold">
                        <Bell size={11} />
                        {formatCountdown(ev.scheduledAt)} · {ev.duration}min
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-xs text-[#9b9e9e]">
                        <div className="flex items-center gap-1"><Clock size={12} />{timeAgo(ev.updatedAt)}</div>
                        <div className="flex items-center gap-1"><Users size={12} />{ev.attendees}</div>
                      </div>
                    )}
                    {ev.roomId && (
                      <button onClick={() => navigate(`/workspace/${ev.roomId}`)}
                        className="w-full mt-1 py-2 rounded-xl bg-[#53fc18] text-black text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#48de13] transition shadow-md"
                      >
                        Open Room <ArrowRight size={12} />
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="bg-[#16191e] rounded-2xl border border-[#2a2d33] p-5 shadow-xl">
              <h3 className="text-xs font-bold text-[#9b9e9e] uppercase tracking-wider mb-3 flex items-center gap-2">
                <Bell size={11} className="text-[#53fc18]" /> Upcoming
              </h3>
              <div className="space-y-2">
                {upcoming.map(s => (
                  <div key={s._id} className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#e8eaed] truncate">{s.title}</p>
                      <p className="text-[10px] text-[#9b9e9e]">{formatCountdown(s.scheduledAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showSchedule && (
          <ScheduleModal
            isOpen={showSchedule}
            onClose={() => setShowSchedule(false)}
            onSave={(s) => setScheduledSessions(prev => [...prev, s])}
            rooms={rooms}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
