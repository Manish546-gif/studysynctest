import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Award, Clock, Users, Edit3, ChevronRight, Loader2 } from 'lucide-react'
import gsap from 'gsap'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
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

export default function Profile() {
  const statsRef = useRef(null)
  const navigate = useNavigate()
  const { user } = useAuth()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)

  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'

  useEffect(() => {
    api.getRooms()
      .then((data) => setRooms(data.rooms || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const createdRooms = rooms.filter((r) => r.host?._id === user?.id)
  const joinedRooms = rooms.filter((r) => r.host?._id !== user?.id)
  const totalMembers = rooms.reduce((sum, r) => sum + (r.members?.length || 0), 0)
  const hasRecent = rooms.some((r) => Date.now() - new Date(r.updatedAt).getTime() < 7 * 86400000)

  const badges = [
    { label: 'First Steps', icon: '🚀', unlocked: rooms.length >= 1, desc: 'Join or create your first room' },
    { label: 'Room Builder', icon: '🏗️', unlocked: createdRooms.length >= 1, desc: 'Create your first room' },
    { label: 'Collab Guru', icon: '🤝', unlocked: joinedRooms.length >= 1, desc: 'Join a room with others' },
    { label: 'Active Today', icon: '⚡', unlocked: hasRecent, desc: 'Active in the last 7 days' },
    { label: 'Study Group', icon: '👥', unlocked: totalMembers >= 5, desc: 'Collaborate with 5+ peers' },
    { label: 'Superhost', icon: '👑', unlocked: createdRooms.length >= 3, desc: 'Create 3 rooms' },
  ]

  const activities = [...rooms]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5)
    .map((r) => {
      const isHost = r.host?._id === user?.id
      return {
        icon: isHost ? Edit3 : Users,
        text: `${isHost ? 'Created' : 'Joined'} room "${r.name}"`,
        time: timeAgo(r.updatedAt),
        roomId: r._id,
      }
    })

  useEffect(() => {
    if (!statsRef.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.count-up',
        { textContent: 0 },
        {
          textContent: (i, el) => el.dataset.target,
          duration: 1.5,
          ease: 'power2.out',
          delay: 0.3,
          snap: { textContent: 1 },
          stagger: 0.15,
        }
      )
    }, statsRef)
    return () => ctx.revert()
  }, [rooms.length, createdRooms.length])

  return (
    <motion.div
      className="p-6 md:p-12 max-w-5xl mx-auto"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Profile Header */}
      <motion.div
        variants={fadeUp}
        className="bg-surface-container-low rounded-3xl p-8 md:p-10 mb-8"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="relative">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary-container flex items-center justify-center text-2xl font-bold font-display text-on-primary-container">
                {initials}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-400 border-2 border-surface-container-low flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
          </div>

          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold text-on-surface mb-1">{user?.name || 'Student'}</h1>
            <p className="text-sm text-on-surface/50">{user?.email}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary-container rounded-xl text-sm font-semibold hover:shadow-sm transition-shadow"
            >
              <Edit3 size={14} />
              Edit Profile
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats + Badges */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        {/* Stats */}
        <motion.div ref={statsRef} variants={fadeUp} className="lg:col-span-2 grid grid-cols-2 gap-4">
          <div className="bg-surface-container-low rounded-2xl p-6 text-center">
            <Users size={20} className="text-primary mx-auto mb-2" />
            <p className="font-display text-3xl font-bold text-on-surface">
              <span className="count-up" data-target={rooms.length}>0</span>
            </p>
            <p className="text-xs text-on-surface/40 mt-1">Study Rooms</p>
          </div>
          <div className="bg-surface-container-low rounded-2xl p-6 text-center">
            <Edit3 size={20} className="text-tertiary mx-auto mb-2" />
            <p className="font-display text-3xl font-bold text-on-surface">
              <span className="count-up" data-target={createdRooms.length}>0</span>
            </p>
            <p className="text-xs text-on-surface/40 mt-1">Rooms Created</p>
          </div>
        </motion.div>

        {/* Badges */}
        <motion.div variants={fadeUp} className="lg:col-span-3">
          <div className="bg-surface-container-low rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award size={18} className="text-primary" />
              <h2 className="font-display text-base font-bold text-on-surface">Achievement Badges</h2>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={18} className="animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {badges.map((b) => (
                  <div
                    key={b.label}
                    className={`flex flex-col items-center text-center p-3 rounded-xl transition-colors ${
                      b.unlocked
                        ? 'bg-surface-container-high hover:bg-primary-container/30 cursor-pointer'
                        : 'bg-surface-container-high/50 opacity-40'
                    }`}
                    title={b.desc}
                  >
                    <span className="text-2xl mb-1">{b.icon}</span>
                    <span className="text-[10px] font-medium text-on-surface/60 leading-tight">{b.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div variants={fadeUp} className="bg-surface-container-low rounded-2xl p-6">
        <h2 className="font-display text-base font-bold text-on-surface mb-4">Recent Activity</h2>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={18} className="animate-spin text-primary" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-10">
            <Clock size={24} className="mx-auto text-on-surface/15 mb-3" />
            <p className="text-sm text-on-surface/40">No activity yet</p>
            <p className="text-xs text-on-surface/25 mt-1">Create or join a room to see activity here</p>
          </div>
        ) : (
          <div className="space-y-1">
            {activities.map((a, i) => {
              const Icon = a.icon
              return (
                <motion.div
                  key={`${a.roomId}-${i}`}
                  variants={fadeUp}
                  onClick={() => navigate(`/workspace/${a.roomId}`)}
                  className="flex items-center gap-4 py-3 border-b border-outline-variant/15 last:border-0 group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center shrink-0 group-hover:bg-primary-container/30 transition-colors">
                    <Icon size={16} className="text-on-surface/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-on-surface/70 truncate">{a.text}</p>
                    <p className="text-[11px] text-on-surface/30 mt-0.5">{a.time}</p>
                  </div>
                  <ChevronRight size={14} className="text-on-surface/20 group-hover:text-on-surface/40 transition-colors shrink-0" />
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
