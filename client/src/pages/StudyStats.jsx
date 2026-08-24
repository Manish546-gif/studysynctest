import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

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
    api.get('/stats')
      .then((r) => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>
  if (!stats) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Failed to load stats</div>

  const statCards = [
    { label: 'Today', value: formatTime(stats.today.total), sub: `${stats.today.sessions} sessions` },
    { label: 'This Week', value: formatTime(stats.thisWeek.total), sub: `${stats.thisWeek.sessions} sessions` },
    { label: 'All Time', value: formatTime(stats.allTime.total), sub: `${stats.allTime.sessions} sessions` },
    { label: 'Streak', value: `${stats.streak} days`, sub: 'consecutive' },
    { label: 'Pomodoros', value: stats.pomodoroSessions, sub: 'total completed' },
  ]

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Study Stats</h1>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {statCards.map((s) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-sm text-white/60 mt-1">{s.label}</div>
              <div className="text-xs text-white/40 mt-0.5">{s.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Daily bar chart */}
        {stats.daily.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">This Week</h2>
            <div className="flex items-end gap-3 h-40">
              {stats.daily.map((d) => {
                const maxT = Math.max(...stats.daily.map((x) => x.total), 1)
                const pct = (d.total / maxT) * 100
                return (
                  <div key={d._id} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-xs text-white/60">{formatTime(d.total)}</div>
                    <div className="w-full bg-purple-600/60 rounded-t-lg" style={{ height: `${Math.max(pct, 4)}%` }} />
                    <div className="text-xs text-white/40">{d._id.slice(5)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Top rooms */}
        {stats.topRooms.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Most Active Rooms</h2>
            {stats.topRooms.map((r, i) => (
              <div key={r._id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white/40">#{i + 1}</span>
                  <span className="font-medium">{r.name}</span>
                </div>
                <span className="text-sm text-white/60">{formatTime(r.total)}</span>
              </div>
            ))}
          </div>
        )}

        <Link to="/dashboard" className="inline-block mt-6 text-purple-400 hover:text-purple-300 transition">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
