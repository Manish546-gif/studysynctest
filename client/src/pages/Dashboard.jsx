import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import {
  Users,
  Pencil,
  ArrowRight,
  Calendar,
  Clock,
  Plus,
  X,
  Loader2,
  Flame,
  Copy,
  Check,
  LogIn,
  KeyRound,
  Trash2,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

const TAG_COLORS = [
  'bg-tertiary-container text-on-tertiary-container',
  'bg-primary-container text-on-primary-container',
  'bg-secondary-container text-on-secondary-container',
  'bg-error-container text-on-error-container',
]

function Avatar({ initials, className = '' }) {
  return (
    <div className={`w-8 h-8 rounded-full bg-surface-container-high border-2 border-surface flex items-center justify-center text-[11px] font-bold font-display text-on-surface-variant ${className}`}>
      {initials}
    </div>
  )
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function sessionDayLabel(date) {
  const today = startOfDay(new Date())
  const day = startOfDay(new Date(date))
  const diffDays = Math.round((today - day) / 86400000)
  if (diffDays === 0) return 'TODAY'
  if (diffDays === 1) return 'YESTERDAY'
  return day.toLocaleDateString([], { month: 'short' }).toUpperCase()
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

export default function Dashboard() {
  const statsRef = useRef(null)
  const { user } = useAuth()
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomDesc, setNewRoomDesc] = useState('')
  const [creatingRoom, setCreatingRoom] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [createdRoom, setCreatedRoom] = useState(null)
  const [codeCopied, setCodeCopied] = useState(false)

  useEffect(() => {
    api.getRooms()
      .then((data) => setRooms(data.rooms || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const displayName = user?.name?.split(' ')[0] || 'there'
  const createdRooms = rooms.filter((r) => r.host?._id === user?.id)
  const recentRooms = [...rooms]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.stat-number',
        { textContent: 0 },
        {
          textContent: (i, el) => el.dataset.target,
          duration: 1.2,
          ease: 'power2.out',
          delay: 0.4,
          snap: { textContent: 1 },
          stagger: 0.2,
        }
      )
    }, statsRef)
    return () => ctx.revert()
  }, [rooms.length, createdRooms.length])

  const handleCreateRoom = async (e) => {
    e.preventDefault()
    if (!newRoomName.trim()) return
    setCreatingRoom(true)
    try {
      const data = await api.createRoom({ name: newRoomName.trim(), description: newRoomDesc.trim() })
      setRooms((prev) => [data.room, ...prev])
      setNewRoomName('')
      setNewRoomDesc('')
      setCreatedRoom(data.room)
      setModal('created')
    } catch (err) {
      alert(err.message)
    } finally {
      setCreatingRoom(false)
    }
  }

  const handleJoinByCode = async (e) => {
    e.preventDefault()
    if (!joinCode.trim()) return
    setJoining(true)
    setJoinError('')
    try {
      const data = await api.verifyCode(joinCode.trim())
      navigate(`/workspace/${data.room._id}`)
    } catch (err) {
      setJoinError(err.message || 'Invalid room code')
    } finally {
      setJoining(false)
    }
  }

  const handleJoinRoom = async (roomId) => {
    try {
      await api.joinRoom(roomId)
    } catch {
      // room already joined or unreachable — open it anyway
    }
    navigate(`/workspace/${roomId}`)
  }

  const handleDeleteRoom = async (roomId) => {
    if (!confirm('Delete this room? This cannot be undone.')) return
    try {
      await api.deleteRoom(roomId)
      setRooms((prev) => prev.filter((r) => r._id !== roomId))
    } catch (err) {
      alert(err.message)
    }
  }

  const copyCode = () => {
    if (createdRoom?.code) {
      navigator.clipboard.writeText(createdRoom.code)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    }
  }

  return (
    <motion.div
      className="p-6 md:p-12 max-w-7xl mx-auto"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Hero + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10 items-start">
        <motion.div
          variants={fadeUp}
          className="lg:col-span-2 relative bg-primary-container rounded-[20px] p-8 md:p-10 overflow-hidden"
        >
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-on-primary-container text-xs font-semibold mb-4">
              <Flame size={14} className="text-primary" />
              {rooms.length} Active {rooms.length === 1 ? 'Room' : 'Rooms'}
            </span>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-on-primary-container mb-3">
              Welcome back, {displayName}!
            </h1>
            <p className="text-on-primary-container/70 text-sm md:text-base max-w-[28rem] mb-8 leading-relaxed">
              You've been crushing it this week. Keep the momentum going - join a room
              or create a new one to start collaborating.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => { setModal('create'); setCreatedRoom(null); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-inverse-surface text-surface rounded-xl text-sm font-semibold hover:shadow-lg transition-shadow"
              >
                <Pencil size={15} />
                Create Room
              </button>
              <button
                onClick={() => { setModal('join'); setJoinCode(''); setJoinError(''); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-surface/30 text-on-primary-container rounded-xl text-sm font-semibold backdrop-blur-sm hover:bg-surface/50 transition-colors"
              >
                <LogIn size={15} />
                Join Room
              </button>
            </div>
          </div>
          <div className="absolute bottom-6 right-8 text-on-primary-container/10">
            <Pencil size={120} strokeWidth={1} />
          </div>
        </motion.div>

        <div ref={statsRef} className="flex flex-col gap-6">
          <motion.div
            variants={fadeUp}
            className="bg-surface-container-low rounded-[20px] p-6 flex items-center gap-5 flex-1"
          >
            <div className="w-14 h-14 rounded-2xl bg-tertiary-container flex items-center justify-center shrink-0">
              <Users size={24} className="text-on-tertiary-container" />
            </div>
            <div>
              <p className="text-xs text-on-surface/50 mb-0.5">Study Rooms</p>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold text-on-surface">
                  <span className="stat-number" data-target={rooms.length}>0</span>
                </span>
                <span className="text-xs font-medium text-on-surface/40">Total</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="bg-surface-container-low rounded-[20px] p-6 flex items-center gap-5 flex-1"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary-container flex items-center justify-center shrink-0">
              <Flame size={24} className="text-on-primary-container" />
            </div>
            <div>
              <p className="text-xs text-on-surface/50 mb-0.5">Rooms Created</p>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold text-on-surface">
                  <span className="stat-number" data-target={createdRooms.length}>0</span>
                </span>
                <span className="text-xs font-medium text-on-surface/40">By you</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <motion.div variants={fadeUp} className="lg:col-span-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl font-bold text-on-surface">My Rooms</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-16 bg-surface-container-low rounded-[20px]">
              <Users size={40} className="mx-auto text-on-surface/20 mb-3" />
              <p className="text-sm text-on-surface/40 mb-1">No rooms yet</p>
              <p className="text-xs text-on-surface/25 mb-4">Create a room or join one with a code</p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setModal('create')} className="px-4 py-2 bg-primary-container text-on-primary-container rounded-xl text-xs font-semibold hover:shadow-sm transition-shadow">
                  Create Room
                </button>
                <button onClick={() => setModal('join')} className="px-4 py-2 bg-surface-container-high text-on-surface rounded-xl text-xs font-semibold hover:shadow-sm transition-shadow">
                  Join with Code
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              {rooms.map((room, idx) => (
                <motion.div
                  key={room._id}
                  whileHover={{ y: -4 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  className="bg-surface-container-low rounded-[20px] overflow-hidden cursor-pointer group"
                  onClick={() => navigate(`/workspace/${room._id}`)}
                >
                  <div className="relative h-40 overflow-hidden bg-gradient-to-br from-primary-container/30 to-secondary-container/30 flex items-center justify-center">
                    <Pencil size={48} className="text-on-surface/10" />
                    <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${TAG_COLORS[idx % TAG_COLORS.length]}`}>
                      {room.tag || 'Study'}
                    </span>
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-surface/80 backdrop-blur-sm rounded-lg px-2 py-1">
                      <KeyRound size={11} className="text-on-surface/60" />
                      <span className="text-[11px] font-bold text-on-surface/80 font-mono tracking-wider">{room.code}</span>
                    </div>
                    {room.host?._id === user?.id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room._id); }}
                        className="absolute bottom-3 right-3 w-8 h-8 rounded-lg bg-error-container/80 backdrop-blur-sm flex items-center justify-center text-error opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-display text-base font-bold text-on-surface mb-3">{room.name}</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {room.members?.slice(0, 3).map((m, i) => (
                          <Avatar
                            key={m._id || i}
                            initials={m.name?.charAt(0) || '?'}
                            className={i > 0 ? '-ml-2' : ''}
                          />
                        ))}
                        {room.members?.length > 3 && (
                          <span className="ml-2 text-xs text-on-surface/45 font-medium">+{room.members.length - 3}</span>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleJoinRoom(room._id); }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-on-primary rounded-xl text-xs font-semibold hover:shadow-md transition-shadow"
                      >
                        Open <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => { setModal('create'); setCreatedRoom(null); }}
              className="flex-1 rounded-[20px] border-2 border-dashed border-outline-variant/40 bg-surface-container-lowest p-8 flex flex-col items-center justify-center gap-3 text-on-surface/45 hover:border-primary/40 hover:bg-surface-container-low transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center">
                <Plus size={22} className="text-on-surface/45" />
              </div>
              <span className="font-display text-sm font-semibold">Create Room</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => { setModal('join'); setJoinCode(''); setJoinError(''); }}
              className="flex-1 rounded-[20px] border-2 border-dashed border-outline-variant/40 bg-surface-container-lowest p-8 flex flex-col items-center justify-center gap-3 text-on-surface/45 hover:border-secondary/40 hover:bg-surface-container-low transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center">
                <KeyRound size={22} className="text-on-surface/45" />
              </div>
              <span className="font-display text-sm font-semibold">Join Room</span>
            </motion.button>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="lg:col-span-4">
          <div className="bg-surface-container-low rounded-[20px] p-6 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-tertiary-container flex items-center justify-center">
                <Calendar size={18} className="text-on-tertiary-container" />
              </div>
              <h2 className="font-display text-lg font-bold text-on-surface">Recent Sessions</h2>
            </div>

            <div className="flex flex-col gap-1 flex-1">
              {recentRooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center flex-1">
                  <Calendar size={28} className="text-on-surface/15 mb-3" />
                  <p className="text-sm text-on-surface/40">No sessions yet</p>
                  <p className="text-xs text-on-surface/25 mt-1">Create or join a room to get started</p>
                </div>
              ) : (
                recentRooms.map((room) => (
                  <div
                    key={room._id}
                    onClick={() => navigate(`/workspace/${room._id}`)}
                    className="flex items-start gap-4 py-4 border-b border-outline-variant/20 last:border-0 cursor-pointer group"
                  >
                    <div className="flex flex-col items-center w-11 shrink-0">
                      <span className="text-[10px] font-bold text-primary tracking-wider leading-none mb-0.5">{sessionDayLabel(room.updatedAt)}</span>
                      <span className="font-display text-2xl font-bold text-on-surface leading-none">{new Date(room.updatedAt).getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate mb-1">{room.name}</p>
                      <div className="flex items-center gap-3 text-xs text-on-surface/45">
                        <span className="inline-flex items-center gap-1">
                          <Clock size={12} /> {timeAgo(room.updatedAt)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users size={12} /> {room.members?.length || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Modal Overlays */}
      <AnimatePresence>
        {modal === 'create' && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModal(null)}
              className="fixed inset-0 bg-inverse-surface/30 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-surface rounded-[24px] shadow-2xl w-full max-w-[28rem] p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-lg font-bold text-on-surface">Create New Room</h2>
                  <button onClick={() => setModal(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface/40 hover:bg-surface-container transition-colors">
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleCreateRoom} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-on-surface/50 mb-1.5">Room Name</label>
                    <input
                      autoFocus
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="e.g., Advanced Algorithms Study"
                      className="w-full rounded-2xl border border-outline-variant/50 bg-surface-container-lowest px-4 py-3 text-sm text-on-surface placeholder:text-on-surface/30 outline-none focus:border-primary-container transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-on-surface/50 mb-1.5">Description (optional)</label>
                    <textarea
                      value={newRoomDesc}
                      onChange={(e) => setNewRoomDesc(e.target.value)}
                      placeholder="What will you study together?"
                      rows={3}
                      className="w-full rounded-2xl border border-outline-variant/50 bg-surface-container-lowest px-4 py-3 text-sm text-on-surface placeholder:text-on-surface/30 outline-none resize-none focus:border-primary-container transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={creatingRoom || !newRoomName.trim()}
                    className="w-full py-3 rounded-2xl bg-primary-container text-on-primary-fixed text-sm font-semibold hover:shadow-md transition-shadow disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {creatingRoom ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    {creatingRoom ? 'Creating...' : 'Create Room'}
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}

        {modal === 'created' && createdRoom && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModal(null)}
              className="fixed inset-0 bg-inverse-surface/30 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-surface rounded-[24px] shadow-2xl w-full max-w-[28rem] p-8 text-center" onClick={(e) => e.stopPropagation()}>
                <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Check size={32} className="text-green-600" />
                </div>
                <h2 className="font-display text-lg font-bold text-on-surface mb-1">Room Created!</h2>
                <p className="text-sm text-on-surface/50 mb-6">Share this code with others to join</p>

                <div className="bg-surface-container-low rounded-2xl p-4 mb-6">
                  <p className="text-[10px] font-semibold text-on-surface/40 uppercase tracking-widest mb-2">Room Code</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="font-mono text-4xl font-bold text-on-surface tracking-[0.3em]">{createdRoom.code}</span>
                    <button
                      onClick={copyCode}
                      className="w-10 h-10 rounded-xl flex items-center justify-center bg-surface-container-high text-on-surface/60 hover:text-on-surface transition-colors"
                    >
                      {codeCopied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setModal(null); navigate(`/workspace/${createdRoom._id}`); }}
                    className="flex-1 py-3 rounded-2xl bg-primary text-on-primary text-sm font-semibold hover:shadow-md transition-shadow"
                  >
                    Enter Room
                  </button>
                  <button
                    onClick={() => setModal(null)}
                    className="px-6 py-3 rounded-2xl bg-surface-container-high text-on-surface text-sm font-medium hover:bg-surface-container-high/80 transition-colors"
                  >
                    Later
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {modal === 'join' && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModal(null)}
              className="fixed inset-0 bg-inverse-surface/30 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-surface rounded-[24px] shadow-2xl w-full max-w-[28rem] p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-lg font-bold text-on-surface">Join Room</h2>
                  <button onClick={() => setModal(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface/40 hover:bg-surface-container transition-colors">
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleJoinByCode} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-on-surface/50 mb-1.5">Room Code</label>
                    <input
                      autoFocus
                      value={joinCode}
                      onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      className="w-full rounded-2xl border border-outline-variant/50 bg-surface-container-lowest px-4 py-3 text-sm text-on-surface placeholder:text-on-surface/30 outline-none focus:border-primary-container transition-colors font-mono text-center text-lg tracking-[0.3em] uppercase"
                    />
                    {joinError && (
                      <p className="text-xs text-error mt-2">{joinError}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={joining || joinCode.length < 6}
                    className="w-full py-3 rounded-2xl bg-primary text-on-primary text-sm font-semibold hover:shadow-md transition-shadow disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {joining ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                    {joining ? 'Verifying...' : 'Join Room'}
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
