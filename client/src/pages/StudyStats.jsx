import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowLeft, Clock, Flame, BarChart3, Zap, Timer } from 'lucide-react'

const formatTime = (seconds) => {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

export default function StudyStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getStats()
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-[#0e0f13] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#53fc18] border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!stats) return (
    <div className="min-h-screen bg-[#0e0f13] flex items-center justify-center">
      <p className="text-[#9b9e9e]">Failed to load stats</p>
    </div>
  )

  const statCards = [
    { label: 'Today', value: formatTime(stats.today.total), sub: `${stats.today.sessions} sessions`, icon: Clock, accent: 'bg-[#53fc18]/15 text-[#53fc18] border border-[#53fc18]/30' },
    { label: 'This Week', value: formatTime(stats.thisWeek.total), sub: `${stats.thisWeek.sessions} sessions`, icon: BarChart3, accent: 'bg-[#53fc18]/15 text-[#53fc18] border border-[#53fc18]/30' },
    { label: 'All Time', value: formatTime(stats.allTime.total), sub: `${stats.allTime.sessions} sessions`, icon: Zap, accent: 'bg-[#53fc18]/15 text-[#53fc18] border border-[#53fc18]/30' },
    { label: 'Streak', value: `${stats.streak} days`, sub: 'consecutive', icon: Flame, accent: 'bg-orange-500/15 text-orange-400 border border-orange-500/30' },
    { label: 'Pomodoros', value: stats.pomodoroSessions, sub: 'completed', icon: Timer, accent: 'bg-green-500/15 text-green-400 border border-green-500/30' },
  ]

  return (
    <div className="min-h-screen bg-[#0e0f13] text-[#e8eaed] p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/dashboard" className="w-9 h-9 rounded-xl flex items-center justify-center text-[#9b9e9e] hover:text-[#e8eaed] bg-[#16191e] border border-[#2a2d33] transition">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-3xl font-bold text-[#e8eaed]">Study Stats</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {statCards.map((s) => {
            const Icon = s.icon
            return (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="bg-[#16191e] rounded-2xl p-5 text-center border border-[#2a2d33] shadow-lg">
                <div className={`w-10 h-10 rounded-xl ${s.accent} flex items-center justify-center mx-auto mb-3`}>
                  <Icon size={18} />
                </div>
                <div className="text-2xl font-extrabold text-[#e8eaed]">{s.value}</div>
                <div className="text-xs font-semibold text-[#9b9e9e] mt-1">{s.label}</div>
                <div className="text-[10px] text-[#9b9e9e]/60 mt-0.5 font-mono">{s.sub}</div>
              </motion.div>
            )
          })}
        </div>

        {stats.daily.length > 0 && (
          <div className="bg-[#16191e] rounded-2xl border border-[#2a2d33] p-6 mb-8 shadow-xl">
            <h2 className="text-lg font-bold text-[#e8eaed] mb-6">This Week Activity</h2>
            <div className="flex items-end gap-3 h-48 pt-4">
              {stats.daily.map((d) => {
                const maxT = Math.max(...stats.daily.map((x) => x.total), 1)
                const pct = (d.total / maxT) * 100
                return (
                  <div key={d._id} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div className="text-[10px] font-mono font-bold text-[#53fc18]">{formatTime(d.total)}</div>
                    <div className="w-full bg-[#53fc18] rounded-t-xl transition-all hover:bg-[#48de13] shadow-[0_0_10px_rgba(83,252,24,0.3)]" style={{ height: `${Math.max(pct, 6)}%` }} />
                    <div className="text-[10px] font-mono font-semibold text-[#9b9e9e]">{d._id.slice(5)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {stats.topRooms.length > 0 && (
          <div className="bg-[#16191e] rounded-2xl border border-[#2a2d33] p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[#e8eaed] mb-4">Most Active Rooms</h2>
            {stats.topRooms.map((r, i) => (
              <div key={r._id} className="flex items-center justify-between py-3 border-b border-[#2a2d33] last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-[#53fc18]">#{i + 1}</span>
                  <span className="font-bold text-[#e8eaed] text-sm">{r.name}</span>
                </div>
                <span className="text-xs font-mono text-[#9b9e9e]">{formatTime(r.total)}</span>
              </div>
            ))}
          </div>
        )}

        <Link to="/dashboard" className="inline-flex items-center gap-2 mt-8 text-xs font-bold text-[#53fc18] hover:underline transition">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
