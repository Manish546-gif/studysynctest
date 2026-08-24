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
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-container border-t-primary rounded-full animate-spin" />
    </div>
  )
  if (!stats) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <p className="text-on-surface/60">Failed to load stats</p>
    </div>
  )

  const statCards = [
    { label: 'Today', value: formatTime(stats.today.total), sub: `${stats.today.sessions} sessions`, icon: Clock, accent: 'bg-primary-container text-on-primary-container' },
    { label: 'This Week', value: formatTime(stats.thisWeek.total), sub: `${stats.thisWeek.sessions} sessions`, icon: BarChart3, accent: 'bg-tertiary-container text-on-tertiary-container' },
    { label: 'All Time', value: formatTime(stats.allTime.total), sub: `${stats.allTime.sessions} sessions`, icon: Zap, accent: 'bg-secondary-container text-on-secondary-container' },
    { label: 'Streak', value: `${stats.streak} days`, sub: 'consecutive', icon: Flame, accent: 'bg-orange-100 text-orange-600' },
    { label: 'Pomodoros', value: stats.pomodoroSessions, sub: 'completed', icon: Timer, accent: 'bg-success-container text-on-success-container' },
  ]

  return (
    <div className="min-h-screen bg-surface text-on-surface p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/dashboard" className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface/40 hover:bg-surface-container transition">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-3xl font-bold">Study Stats</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {statCards.map((s) => {
            const Icon = s.icon
            return (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="bg-surface-container-low rounded-2xl p-4 text-center border border-outline-variant/20">
                <div className={`w-10 h-10 rounded-xl ${s.accent} flex items-center justify-center mx-auto mb-2`}>
                  <Icon size={18} />
                </div>
                <div className="text-2xl font-bold text-on-surface">{s.value}</div>
                <div className="text-sm text-on-surface/60 mt-1">{s.label}</div>
                <div className="text-xs text-on-surface/40 mt-0.5">{s.sub}</div>
              </motion.div>
            )
          })}
        </div>

        {stats.daily.length > 0 && (
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/20 p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">This Week</h2>
            <div className="flex items-end gap-3 h-40">
              {stats.daily.map((d) => {
                const maxT = Math.max(...stats.daily.map((x) => x.total), 1)
                const pct = (d.total / maxT) * 100
                return (
                  <div key={d._id} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-xs text-on-surface/60">{formatTime(d.total)}</div>
                    <div className="w-full bg-primary/60 rounded-t-lg" style={{ height: `${Math.max(pct, 4)}%` }} />
                    <div className="text-xs text-on-surface/40">{d._id.slice(5)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {stats.topRooms.length > 0 && (
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/20 p-6">
            <h2 className="text-lg font-semibold mb-4">Most Active Rooms</h2>
            {stats.topRooms.map((r, i) => (
              <div key={r._id} className="flex items-center justify-between py-2 border-b border-outline-variant/10 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-on-surface/40">#{i + 1}</span>
                  <span className="font-medium text-on-surface">{r.name}</span>
                </div>
                <span className="text-sm text-on-surface/60">{formatTime(r.total)}</span>
              </div>
            ))}
          </div>
        )}

        <Link to="/dashboard" className="inline-flex items-center gap-1 mt-6 text-primary hover:text-primary/80 transition">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
