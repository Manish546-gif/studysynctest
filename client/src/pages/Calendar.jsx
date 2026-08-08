import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Clock, Users, Loader2, ArrowRight } from 'lucide-react'
import { api } from '../services/api'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const SESSION_COLORS = ['bg-tertiary', 'bg-primary', 'bg-secondary', 'bg-[#FF4262]', 'bg-green-500']

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function Calendar() {
  const navigate = useNavigate()
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDay, setSelectedDay] = useState(today.getDate())
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getRooms()
      .then((data) => setRooms(data.rooms || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const sessions = rooms.map((room, i) => {
    const d = new Date(room.createdAt || room.updatedAt)
    return {
      day: d.getDate(),
      month: d.getMonth(),
      year: d.getFullYear(),
      roomId: room._id,
      title: room.name,
      updatedAt: room.updatedAt,
      attendees: room.members?.length || 0,
      color: SESSION_COLORS[i % SESSION_COLORS.length],
    }
  })

  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1) }
    else setCurrentMonth((m) => m - 1)
  }

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1) }
    else setCurrentMonth((m) => m + 1)
  }

  const getSessionsForDay = (day) => sessions.filter((s) => s.day === day && s.month === currentMonth && s.year === currentYear)
  const selectedSessions = getSessionsForDay(selectedDay)

  const calendarDays = []
  for (let i = 0; i < firstDay; i++) calendarDays.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d)

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-on-surface">Calendar</h1>
        <p className="text-sm text-on-surface/50 mt-1">Sessions you created or joined, plotted by date.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-surface-container-low rounded-2xl border border-outline-variant/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-display font-bold text-on-surface">
              {MONTHS[currentMonth]} {currentYear}
            </h2>
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="w-9 h-9 rounded-xl flex items-center justify-center text-on-surface/50 hover:bg-surface-container transition-colors">
                <ChevronLeft size={18} />
              </button>
              <button onClick={nextMonth} className="w-9 h-9 rounded-xl flex items-center justify-center text-on-surface/50 hover:bg-surface-container transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[11px] font-semibold text-on-surface/40 uppercase py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />
              const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()
              const isSelected = day === selectedDay
              const hasSessions = getSessionsForDay(day).length > 0

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`relative h-12 rounded-xl flex flex-col items-center justify-center text-sm transition-all ${
                    isSelected
                      ? 'bg-primary text-on-primary font-bold shadow-sm'
                      : isToday
                      ? 'bg-primary-container text-on-primary-container font-semibold'
                      : 'text-on-surface/60 hover:bg-surface-container'
                  }`}
                >
                  {day}
                  {hasSessions && (
                    <div className={`absolute bottom-1.5 w-1 h-1 rounded-full ${isSelected ? 'bg-on-primary' : 'bg-primary'}`} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected day sessions */}
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant/20 p-6">
          <h3 className="text-sm font-semibold text-on-surface/50 uppercase tracking-wider mb-4">
            {MONTHS[currentMonth]} {selectedDay}, {currentYear}
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-primary" />
            </div>
          ) : selectedSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center mb-3">
                <Clock size={22} className="text-on-surface/25" />
              </div>
              <p className="text-sm text-on-surface/40">No sessions scheduled</p>
              <p className="text-xs text-on-surface/25 mt-1">Click a day to view details</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedSessions.map((session, i) => (
                <motion.div
                  key={session.roomId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/15 space-y-2"
                >
                  <div className={`inline-flex px-2 py-0.5 rounded-lg text-[10px] font-semibold ${session.color} text-white`}>
                    Study Session
                  </div>
                  <h4 className="text-sm font-semibold text-on-surface">{session.title}</h4>
                  <div className="flex items-center gap-3 text-xs text-on-surface/50">
                    <div className="flex items-center gap-1"><Clock size={12} />{timeAgo(session.updatedAt)}</div>
                    <div className="flex items-center gap-1"><Users size={12} />{session.attendees} {session.attendees === 1 ? 'person' : 'people'}</div>
                  </div>
                  <button
                    onClick={() => navigate(`/workspace/${session.roomId}`)}
                    className="w-full mt-1 py-2 rounded-lg bg-primary-container text-on-primary-container text-xs font-semibold flex items-center justify-center gap-1.5 hover:shadow-sm transition-shadow"
                  >
                    Open Session <ArrowRight size={12} />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
