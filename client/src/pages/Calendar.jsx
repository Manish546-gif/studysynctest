import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Clock, Users, ArrowRight } from 'lucide-react'
import { api } from '../services/api'
import Skeleton from '../components/common/Skeleton'

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
    <div className="min-h-screen bg-[#0e0f13] text-[#e8eaed] p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#e8eaed]">Calendar</h1>
        <p className="text-sm text-[#9b9e9e] mt-1">Sessions you created or joined, plotted by date.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-[#16191e] rounded-2xl border border-[#2a2d33] p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#e8eaed]">
              {MONTHS[currentMonth]} {currentYear}
            </h2>
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="w-9 h-9 rounded-xl flex items-center justify-center text-[#9b9e9e] hover:text-[#e8eaed] hover:bg-[#20242b] transition-colors">
                <ChevronLeft size={18} />
              </button>
              <button onClick={nextMonth} className="w-9 h-9 rounded-xl flex items-center justify-center text-[#9b9e9e] hover:text-[#e8eaed] hover:bg-[#20242b] transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[11px] font-bold text-[#9b9e9e] uppercase py-2 tracking-wider">{d}</div>
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
                  className={`relative h-12 rounded-xl flex flex-col items-center justify-center text-sm font-semibold transition-all ${
                    isSelected
                      ? 'bg-[#53fc18] text-black font-extrabold shadow-[0_0_12px_rgba(83,252,24,0.3)] scale-105'
                      : isToday
                      ? 'bg-[#53fc18]/20 text-[#53fc18] border border-[#53fc18]/40'
                      : 'text-[#e8eaed] hover:bg-[#20242b]'
                  }`}
                >
                  {day}
                  {hasSessions && (
                    <div className={`absolute bottom-1.5 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-black' : 'bg-[#53fc18]'}`} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected day sessions */}
        <div className="bg-[#16191e] rounded-2xl border border-[#2a2d33] p-6 shadow-xl flex flex-col">
          <h3 className="text-xs font-bold text-[#9b9e9e] uppercase tracking-wider mb-4">
            {MONTHS[currentMonth]} {selectedDay}, {currentYear}
          </h3>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ) : selectedSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center flex-1">
              <div className="w-14 h-14 rounded-2xl bg-[#0e0f13] border border-[#2a2d33] flex items-center justify-center mb-3">
                <Clock size={22} className="text-[#9b9e9e]/40" />
              </div>
              <p className="text-sm font-semibold text-[#9b9e9e]">No sessions scheduled</p>
              <p className="text-xs text-[#9b9e9e]/50 mt-1">Select a day to view details</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedSessions.map((session, i) => (
                <motion.div
                  key={session.roomId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-4 rounded-xl bg-[#0e0f13] border border-[#2a2d33] space-y-2.5"
                >
                  <div className="inline-flex px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-[#53fc18]/15 border border-[#53fc18]/30 text-[#53fc18]">
                    Study Session
                  </div>
                  <h4 className="text-sm font-bold text-[#e8eaed]">{session.title}</h4>
                  <div className="flex items-center gap-3 text-xs text-[#9b9e9e]">
                    <div className="flex items-center gap-1"><Clock size={13} />{timeAgo(session.updatedAt)}</div>
                    <div className="flex items-center gap-1"><Users size={13} />{session.attendees} {session.attendees === 1 ? 'person' : 'people'}</div>
                  </div>
                  <button
                    onClick={() => navigate(`/workspace/${session.roomId}`)}
                    className="w-full mt-2 py-2.5 rounded-xl bg-[#53fc18] text-black text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#48de13] transition shadow-md"
                  >
                    Open Session <ArrowRight size={13} />
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
