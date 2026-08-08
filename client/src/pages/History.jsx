import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Clock, ArrowRight, ChevronDown, Loader2 } from 'lucide-react'
import { api } from '../services/api'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
}

const participantColors = ['bg-tertiary', 'bg-green-400', 'bg-primary', 'bg-secondary', 'bg-[#FF4262]']

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function bucketLabel(date) {
  const today = startOfDay(new Date())
  const day = startOfDay(new Date(date))
  const diffDays = Math.round((today - day) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return 'This Week'
  return day.toLocaleDateString([], { month: 'long', year: 'numeric' })
}

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

function fullTime(date) {
  return new Date(date).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function initialsOf(name) {
  return (name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function ParticipantAvatar({ initials, index }) {
  return (
    <div className={`w-7 h-7 rounded-full ${participantColors[index % participantColors.length]} flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-surface`}>
      {initials}
    </div>
  )
}

const bucketOrder = ['Today', 'Yesterday', 'This Week']

export default function History() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')

  useEffect(() => {
    api.getRooms()
      .then((data) => setRooms(data.rooms || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const grouped = rooms.reduce((acc, room) => {
    const label = bucketLabel(room.updatedAt)
    if (!acc[label]) acc[label] = []
    acc[label].push(room)
    return acc
  }, {})

  const orderedBuckets = [...bucketOrder, ...Object.keys(grouped).filter((k) => !bucketOrder.includes(k))]

  const filtered = orderedBuckets
    .filter((label) => grouped[label]?.length)
    .map((label) => ({
      group: label,
      items: grouped[label]
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .map((room) => ({
          id: room._id,
          title: room.name,
          time: fullTime(room.updatedAt),
          duration: timeAgo(room.updatedAt),
          participants: (room.members || []).map((m) => initialsOf(m.name)),
          tags: [room.tag].filter(Boolean),
        })),
    }))
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (s) =>
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      ),
    }))
    .filter((g) => g.items.length > 0)

  return (
    <motion.div
      className="p-6 md:p-12 max-w-5xl mx-auto"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="mb-8">
        <h1 className="font-display text-3xl font-bold text-on-surface mb-2">Session History</h1>
        <p className="text-on-surface/50 text-sm">Review your past study sessions and materials.</p>
      </motion.div>

      {/* Search + Filter */}
      <motion.div variants={fadeUp} className="flex items-center gap-3 mb-8">
        <div className="flex-1 flex items-center gap-2 bg-surface-container-low rounded-xl px-4 py-2.5 border border-outline-variant/30 focus-within:border-primary-container transition-colors">
          <Search size={16} className="text-on-surface/30 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions..."
            className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface/30 outline-none"
          />
        </div>
        <button
          onClick={() => setActiveFilter(activeFilter === 'all' ? 'starred' : 'all')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
            activeFilter !== 'all'
              ? 'bg-primary-container text-on-primary-container border-primary-container'
              : 'bg-surface-container-low text-on-surface/60 border-outline-variant/30 hover:bg-surface-container'
          }`}
        >
          <Filter size={14} />
          {activeFilter === 'all' ? 'Filter' : 'Starred'}
        </button>
      </motion.div>

      {/* Timeline */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 bg-surface-container-low rounded-2xl">
          <Clock size={36} className="mx-auto text-on-surface/20 mb-3" />
          {rooms.length === 0 ? (
            <>
              <p className="text-sm text-on-surface/40 mb-1">No sessions yet</p>
              <p className="text-xs text-on-surface/25">Create or join a room and it will show up here</p>
            </>
          ) : (
            <p className="text-sm text-on-surface/40">No sessions found matching "{search}"</p>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {filtered.map((group) => (
            <motion.div key={group.group} variants={fadeUp}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">{group.group}</span>
                <div className="flex-1 h-px bg-outline-variant/20" />
              </div>

              <div className="space-y-3">
                {group.items.map((session) => (
                  <motion.div
                    key={session.id}
                    variants={fadeUp}
                    whileHover={{ y: -2, transition: { duration: 0.15 } }}
                    onClick={() => navigate(`/workspace/${session.id}`)}
                    className="flex items-start gap-4 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/20 cursor-pointer group hover:border-outline-variant/40 transition-colors"
                  >
                    {/* Time indicator */}
                    <div className="flex flex-col items-center w-12 shrink-0 pt-0.5">
                      <Clock size={14} className="text-primary mb-1" />
                      <span className="text-[10px] font-medium text-on-surface/40 text-center leading-tight">
                        {session.duration}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-on-surface mb-1 group-hover:text-primary transition-colors">
                        {session.title}
                      </h3>
                      <p className="text-xs text-on-surface/40 mb-2">{session.time}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {session.tags.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-surface-container-high rounded-md text-[10px] font-medium text-on-surface/50">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Participants + action */}
                    <div className="flex items-center gap-3 shrink-0">
                      {session.participants.length > 0 && (
                        <div className="flex -space-x-1.5">
                          {session.participants.slice(0, 4).map((p, i) => (
                            <ParticipantAvatar key={`${session.id}-${p}-${i}`} initials={p} index={i} />
                          ))}
                        </div>
                      )}
                      <button className="w-8 h-8 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:shadow-sm">
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Load more */}
      {filtered.length > 0 && rooms.length > 8 && (
        <motion.div variants={fadeUp} className="mt-8 text-center">
          <button
            onClick={() => {}}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-outline-variant/40 text-sm font-medium text-on-surface/50 hover:bg-surface-container-low transition-colors"
          >
            <ChevronDown size={16} />
            Show Older Sessions
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}
