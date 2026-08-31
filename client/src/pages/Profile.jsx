import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Clock, Users, Edit3, ChevronRight, Loader2, Settings, Camera, UserRound, AtSign, Check } from 'lucide-react'
import gsap from 'gsap'
import { useAuth } from '../contexts/AuthContext'
import { api, getAssetUrl } from '../services/api'

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
  const { user, updateUser } = useAuth()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)

  const [username, setUsername] = useState(user?.username || '')
  const [usernameError, setUsernameError] = useState('')
  const [savingUsername, setSavingUsername] = useState(false)
  const [usernameSaved, setUsernameSaved] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef(null)

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  useEffect(() => {
    if (user?.username) setUsername(user.username)
  }, [user?.username])

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const data = await api.uploadAvatar(file)
      await updateUser(data.user)
    } catch (err) {
      alert(err.message || 'Failed to upload avatar')
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSaveUsername = async () => {
    const val = username.trim()
    if (!/^[a-z0-9_]{3,24}$/.test(val)) {
      setUsernameError('3-24 characters, lowercase letters, numbers and _ only (no spaces)')
      return
    }
    setUsernameError('')
    setSavingUsername(true)
    setUsernameSaved(false)
    try {
      await updateUser({ username: val })
      setUsernameSaved(true)
      setTimeout(() => setUsernameSaved(false), 2000)
    } catch (err) {
      setUsernameError(err.message || 'Could not update username')
    } finally {
      setSavingUsername(false)
    }
  }

  useEffect(() => {
    api.getRooms()
      .then((data) => setRooms(data.rooms || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const createdRooms = rooms.filter((r) => r.host?._id === user?.id)
  const joinedRooms = rooms.filter((r) => r.host?._id !== user?.id)

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

  const hasAvatar = user?.avatar && user.avatar.trim().length > 0

  return (
    <motion.div
      className="p-6 md:p-12 max-w-4xl mx-auto"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Profile Header */}
      <motion.div
        variants={fadeUp}
        className="bg-surface-container-low rounded-3xl hairline p-8 md:p-10 mb-8"
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="group block relative"
              title="Change profile picture"
            >
              {uploadingAvatar ? (
                <div className="w-24 h-24 rounded-full bg-surface-container-high flex items-center justify-center ring-4 ring-surface-container-high">
                  <Loader2 size={24} className="animate-spin text-primary" />
                </div>
              ) : hasAvatar ? (
                <img
                  src={getAssetUrl(user.avatar)}
                  alt={user.name}
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-surface-container-high"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary-container flex items-center justify-center text-3xl font-bold font-display text-on-primary-container ring-4 ring-surface-container-high">
                  {initials}
                </div>
              )}
              <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera size={22} className="text-white" />
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="font-display text-2xl font-bold text-on-surface mb-1">
              {user?.name || 'Student'}
            </h1>
            <p className="flex items-center justify-center sm:justify-start gap-1 text-sm text-primary mb-1">
              <AtSign size={13} /> {user?.username || 'username'}
            </p>
            <p className="text-sm text-on-surface/50 mb-4">{user?.email}</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-on-surface/40">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high">
                <Users size={13} /> {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high">
                <Edit3 size={13} /> {createdRooms.length} created
              </span>
            </div>
          </div>

          {/* Settings link */}
          <button
            onClick={() => navigate('/settings')}
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-high text-on-surface/60 text-sm font-medium hover:bg-primary-container hover:text-on-primary-container transition-colors"
          >
            <Settings size={15} />
            Settings
          </button>
        </div>
      </motion.div>

      {/* Profile Details / Username */}
      <motion.div variants={fadeUp} className="bg-surface-container-low rounded-2xl hairline p-6 mb-8">
        <h2 className="font-display text-base font-bold text-on-surface mb-4 flex items-center gap-2">
          <UserRound size={16} className="text-primary" /> Profile Details
        </h2>
        <div>
          <label className="text-xs font-medium text-on-surface/50 mb-1.5 block">Username</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-on-surface/40 shrink-0">@</span>
              <input
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))
                  setUsernameError('')
                }}
                placeholder="username"
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                className="min-w-0 flex-1 bg-surface-container-high rounded-xl hairline px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary placeholder:text-on-surface/25"
              />
              <button
                onClick={handleSaveUsername}
                disabled={savingUsername || username === user?.username}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-medium hover:opacity-90 transition disabled:opacity-40"
              >
                {savingUsername ? <Loader2 size={14} className="animate-spin" /> : usernameSaved ? <Check size={14} /> : null}
                {savingUsername ? 'Saving' : usernameSaved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
          {usernameError && <p className="text-xs text-red-400 mt-1.5">{usernameError}</p>}
          <p className="text-[11px] text-on-surface/30 mt-1.5">
            3-24 characters. Lowercase letters, numbers and underscores only. No spaces. This is how people find and mention you.
          </p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div ref={statsRef} variants={fadeUp} className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-surface-container-low rounded-2xl hairline p-6 text-center">
          <Users size={20} className="text-primary mx-auto mb-2" />
          <p className="font-display text-3xl font-bold text-on-surface">
            <span className="count-up" data-target={rooms.length}>0</span>
          </p>
          <p className="text-xs text-on-surface/40 mt-1">Total Rooms</p>
        </div>
        <div className="bg-surface-container-low rounded-2xl hairline p-6 text-center">
          <Edit3 size={20} className="text-tertiary mx-auto mb-2" />
          <p className="font-display text-3xl font-bold text-on-surface">
            <span className="count-up" data-target={createdRooms.length}>0</span>
          </p>
          <p className="text-xs text-on-surface/40 mt-1">Created</p>
        </div>
        <div className="bg-surface-container-low rounded-2xl hairline p-6 text-center">
          <Users size={20} className="text-secondary mx-auto mb-2" />
          <p className="font-display text-3xl font-bold text-on-surface">
            <span className="count-up" data-target={joinedRooms.length}>0</span>
          </p>
          <p className="text-xs text-on-surface/40 mt-1">Joined</p>
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={fadeUp} className="bg-surface-container-low rounded-2xl hairline p-6">
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
