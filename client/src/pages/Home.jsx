import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  Users, Zap, Plus, DoorOpen, Eye, Radio, Sparkles,
  ArrowRight, Lock, Play, BookOpen, Clock, Activity,
  Globe, Wifi, Unlock, Code2, FlaskConical
} from 'lucide-react'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

// ── Streamlined Filters ──────────────────────────────────────────────────
const QUICK_FILTERS = [
  { id: 'all', label: 'All Rooms', tag: 'All', Icon: Globe },
  { id: 'live', label: 'Live Now', tag: 'Live', Icon: Wifi },
  { id: 'public', label: 'Public', tag: 'Public', Icon: Unlock },
  { id: 'private', label: 'Private', tag: 'Private', Icon: Lock },
  { id: 'cs', label: 'CS & Tech', tag: 'Programming', Icon: Code2 },
  { id: 'math', label: 'Math & Science', tag: 'Math', Icon: FlaskConical },
]

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [roomCode, setRoomCode] = useState('')
  const [activeHeroIdx, setActiveHeroIdx] = useState(0)

  useEffect(() => {
    api.getRooms()
      .then((d) => setRooms(d.rooms || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleJoin = (roomId) => {
    navigate(`/workspace/${roomId}`)
  }

  const handleCodeSubmit = (e) => {
    e.preventDefault()
    if (!roomCode.trim()) return
    const code = roomCode.trim().toUpperCase()
    const found = rooms.find((r) => r.code?.toUpperCase() === code || r._id === roomCode.trim())
    if (found) {
      navigate(`/workspace/${found._id}`)
    } else {
      navigate(`/dashboard?code=${code}`)
    }
  }

  // Filtered rooms logic
  const liveRooms = rooms.filter((r) => r.isLive || (r.activeUsersCount > 0))
  const featuredRooms = liveRooms.length > 0 ? liveRooms : rooms

  const displayedRooms = rooms.filter((r) => {
    const isLive = r.isLive || (r.activeUsersCount > 0)
    if (filter === 'live') return isLive
    if (filter === 'public') return !r.isPrivate
    if (filter === 'private') return r.isPrivate
    if (filter === 'cs') return (r.tags || r.subjects || []).includes('Programming') || r.name?.toLowerCase().includes('cs')
    if (filter === 'math') return (r.tags || r.subjects || []).includes('Math') || (r.tags || r.subjects || []).includes('Science')
    return true
  })

  // Auto-rotate hero banner
  useEffect(() => {
    if (featuredRooms.length <= 1) return
    const timer = setInterval(() => {
      setActiveHeroIdx((prev) => (prev + 1) % Math.min(featuredRooms.length, 5))
    }, 6000)
    return () => clearInterval(timer)
  }, [featuredRooms.length])

  const activeHero = featuredRooms[activeHeroIdx] || rooms[0]

  return (
    <div className="min-h-screen bg-[#0e0f13] text-[#e8eaed] pb-16">
      {/* ── HERO SECTION ────────────────────────────────────────────────── */}
      <div className="bg-[#0e0f13] border-b border-[#2a2d33] py-10 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-center justify-between">
          {/* Left Text & Actions */}
          <div className="flex-1 space-y-5 max-w-2xl w-full">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#16191e] border border-[#2a2d33] text-[#53fc18] text-xs font-bold uppercase tracking-wider w-fit">
              <Sparkles size={14} /> Collaborative Live Study Stages
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
              Study Live Together.<br />
              <span className="text-[#53fc18]">
                Voice, Video & Realtime Canvas.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-[#9b9e9e] leading-relaxed">
              Join interactive study rooms with live voice stages, shared whiteboards, YouTube watch-together, and real-time collaborative focus tools.
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/dashboard"
                className="px-6 py-3 rounded-xl bg-[#53fc18] text-black font-extrabold text-sm hover:bg-[#48de13] transition-all flex items-center gap-2"
              >
                <Plus size={18} /> Create Live Room
              </Link>
              <Link
                to="/directory"
                className="px-6 py-3 rounded-xl bg-[#16191e] border border-[#2a2d33] text-[#e8eaed] font-bold text-sm hover:bg-[#20242b] transition-all flex items-center gap-2"
              >
                <Radio size={16} className="text-[#53fc18]" /> Explore Public Rooms
              </Link>
            </div>

            {/* Quick Code Join Bar */}
            <form onSubmit={handleCodeSubmit} className="pt-2">
              <div className="flex items-center max-w-md bg-[#16191e] border border-[#2a2d33] rounded-xl p-1.5 focus-within:border-[#53fc18] transition-all">
                <DoorOpen size={18} className="text-[#9b9e9e] ml-3 shrink-0" />
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  placeholder="Enter 6-digit room code..."
                  className="w-full bg-transparent px-3 py-1.5 text-xs text-[#e8eaed] placeholder:text-[#9b9e9e]/60 outline-none font-mono uppercase tracking-wider"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#2a2d33] text-[#53fc18] hover:bg-[#53fc18] hover:text-black font-extrabold text-xs transition-all shrink-0 flex items-center gap-1"
                >
                  Join <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </div>

          {/* Right Featured Live Stage Preview Card */}
          <div className="w-full lg:w-[440px] shrink-0">
            {activeHero ? (
              <motion.div
                key={activeHero._id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                onClick={() => handleJoin(activeHero._id)}
                className="relative rounded-2xl border border-[#2a2d33] overflow-hidden bg-[#16191e] shadow-2xl group cursor-pointer hover:border-[#53fc18] transition-all"
              >
                {/* Stage Cover (Flat Dark) */}
                <div className="aspect-video relative p-6 flex flex-col justify-between bg-[#16191e] border-b border-[#2a2d33]">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between z-10">
                    {(activeHero.isLive || (activeHero.activeUsersCount > 0)) ? (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-600 text-white font-extrabold text-[10px] uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        <Radio size={10} /> LIVE
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0e0f13] border border-[#2a2d33] text-[#9b9e9e] font-bold text-[10px] uppercase">
                        <Wifi size={10} className="opacity-40" /> OFFLINE
                      </span>
                    )}
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0e0f13] text-[10px] font-bold text-[#9b9e9e] border border-[#2a2d33]">
                      <Users size={10} className="text-[#53fc18]" />
                      {activeHero.members?.length || 0} members
                    </span>
                  </div>

                  {/* Center Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60">
                    <div className="w-14 h-14 rounded-full bg-[#53fc18] text-black flex items-center justify-center font-bold">
                      <Play size={24} className="ml-1" fill="currentColor" />
                    </div>
                  </div>

                  {/* Bottom Meta */}
                  <div className="z-10 bg-[#0e0f13] border border-[#2a2d33] rounded-xl p-4 mt-auto">
                    <h3 className="text-lg font-bold text-white truncate mb-1">{activeHero.name}</h3>
                    <p className="text-xs text-[#9b9e9e] line-clamp-1 mb-3">
                      {activeHero.description || 'Interactive collaborative study room'}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#9b9e9e]">
                        <Users size={13} className="text-[#53fc18]" />
                        {activeHero.activeUsersCount || 0} online now
                      </div>
                      <span className="px-3 py-1 rounded-lg bg-[#53fc18] text-black font-extrabold text-xs flex items-center gap-1">
                        <ArrowRight size={12} /> Join Room
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hero Stage Indicators */}
                {featuredRooms.length > 1 && (
                  <div className="flex items-center justify-center gap-1.5 p-3 bg-[#0e0f13]">
                    {featuredRooms.slice(0, 5).map((_, i) => (
                      <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setActiveHeroIdx(i) }}
                        className={`h-1.5 rounded-full transition-all ${i === activeHeroIdx ? 'w-6 bg-[#53fc18]' : 'w-2 bg-[#2a2d33] hover:bg-[#9b9e9e]'}`}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="rounded-2xl border border-[#2a2d33] bg-[#16191e] p-8 text-center space-y-4 shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-[#0e0f13] border border-[#2a2d33] flex items-center justify-center mx-auto text-[#53fc18]">
                  <Sparkles size={32} />
                </div>
                <h3 className="text-lg font-bold text-white">Start Your First Live Stage</h3>
                <p className="text-xs text-[#9b9e9e]">Create a room and invite classmates to study together with video, voice, and whiteboard.</p>
                <Link to="/dashboard" className="inline-block px-5 py-2.5 bg-[#53fc18] text-black rounded-xl font-extrabold text-xs hover:bg-[#48de13] transition">
                  + Create Stage Now
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── QUICK ACCESS DOCK ───────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/dashboard"
            className="p-4 rounded-2xl bg-[#16191e] border border-[#2a2d33] hover:border-[#53fc18] transition-all group flex items-center gap-3.5"
          >
            <div className="w-11 h-11 rounded-xl bg-[#0e0f13] border border-[#2a2d33] text-[#53fc18] flex items-center justify-center shrink-0">
              <Plus size={20} />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-white group-hover:text-[#53fc18] transition-colors">Create Room</h4>
              <p className="text-[10px] text-[#9b9e9e]">Host live session</p>
            </div>
          </Link>

          <Link
            to="/whiteboards"
            className="p-4 rounded-2xl bg-[#16191e] border border-[#2a2d33] hover:border-[#53fc18] transition-all group flex items-center gap-3.5"
          >
            <div className="w-11 h-11 rounded-xl bg-[#0e0f13] border border-[#2a2d33] text-purple-400 flex items-center justify-center shrink-0">
              <BookOpen size={20} />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-white group-hover:text-purple-400 transition-colors">Whiteboards</h4>
              <p className="text-[10px] text-[#9b9e9e]">Draw & sketch notes</p>
            </div>
          </Link>

          <Link
            to="/flashcards"
            className="p-4 rounded-2xl bg-[#16191e] border border-[#2a2d33] hover:border-[#53fc18] transition-all group flex items-center gap-3.5"
          >
            <div className="w-11 h-11 rounded-xl bg-[#0e0f13] border border-[#2a2d33] text-amber-400 flex items-center justify-center shrink-0">
              <Zap size={20} />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-white group-hover:text-amber-400 transition-colors">Flashcards</h4>
              <p className="text-[10px] text-[#9b9e9e]">Spaced repetition</p>
            </div>
          </Link>

          <Link
            to="/calendar"
            className="p-4 rounded-2xl bg-[#16191e] border border-[#2a2d33] hover:border-[#53fc18] transition-all group flex items-center gap-3.5"
          >
            <div className="w-11 h-11 rounded-xl bg-[#0e0f13] border border-[#2a2d33] text-cyan-400 flex items-center justify-center shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-white group-hover:text-cyan-400 transition-colors">Calendar</h4>
              <p className="text-[10px] text-[#9b9e9e]">Scheduled sessions</p>
            </div>
          </Link>
        </div>
      </div>

      {/* ── LIVE STAGES & EXPLORE SECTION ───────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 mt-10 space-y-6">
        {/* Streamlined Filter Bar */}
        <div className="flex items-center justify-between border-b border-[#2a2d33] pb-4 flex-wrap gap-4">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            {QUICK_FILTERS.map((f) => {
              const IconComp = f.Icon
              const isActive = filter === f.id
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-[#53fc18] text-black'
                      : 'bg-[#16191e] text-[#9b9e9e] border border-[#2a2d33] hover:bg-[#20242b] hover:text-[#e8eaed]'
                  }`}
                >
                  <IconComp size={12} className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`} />
                  {f.label}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-[#9b9e9e]">
            <Activity size={14} className="text-[#53fc18]" /> {displayedRooms.length} Room{displayedRooms.length !== 1 ? 's' : ''} Available
          </div>
        </div>

        {/* Room Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-[#16191e] border border-[#2a2d33] h-64 animate-pulse p-4 space-y-3">
                <div className="w-full h-32 bg-[#0e0f13] rounded-xl" />
                <div className="h-4 bg-[#0e0f13] rounded w-3/4" />
                <div className="h-3 bg-[#0e0f13] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : displayedRooms.length === 0 ? (
          <div className="text-center py-16 bg-[#16191e] rounded-2xl border border-[#2a2d33] p-8 space-y-4">
            <Radio size={40} className="text-[#9b9e9e]/40 mx-auto" />
            <h3 className="text-lg font-bold text-white">No rooms found in this category</h3>
            <p className="text-xs text-[#9b9e9e]">Create a room or change the filter above to discover active study spaces.</p>
            <button
              onClick={() => setFilter('all')}
              className="px-5 py-2.5 bg-[#53fc18] text-black rounded-xl text-xs font-extrabold hover:bg-[#48de13] transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayedRooms.map((room, index) => {
              const activeCount = room.activeUsersCount || 0
              const totalMembers = room.members?.length || 0
              const isLive = room.isLive || activeCount > 0
              const tag = (room.tags || room.subjects || [])[0] || 'Study'

              return (
                <motion.div
                  key={room._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => handleJoin(room._id)}
                  className="bg-[#16191e] border border-[#2a2d33] rounded-2xl overflow-hidden shadow-lg group hover:border-[#53fc18] transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Thumbnail Stage (Solid Dark Card) */}
                    <div className="aspect-video relative p-4 flex flex-col justify-between bg-[#0e0f13] border-b border-[#2a2d33]">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between">
                        {isLive ? (
                          <span className="px-2.5 py-0.5 rounded-md bg-red-600 text-white font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
                            <Radio size={9} /> LIVE
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-md bg-[#16191e] text-[#9b9e9e] font-bold text-[10px] border border-[#2a2d33] flex items-center gap-1">
                            <Wifi size={9} className="opacity-40" /> OFFLINE
                          </span>
                        )}

                        {room.isPrivate ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-[10px] font-bold text-amber-400 border border-amber-500/30 flex items-center gap-1">
                            <Lock size={9} /> Private
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-[#16191e] text-[10px] font-bold text-[#53fc18] border border-[#2a2d33] flex items-center gap-1">
                            <Globe size={9} /> Public
                          </span>
                        )}
                      </div>

                      {/* Center Room Initial */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-5xl font-black text-white/10 select-none">
                          {(room.name || 'R')[0].toUpperCase()}
                        </span>
                      </div>

                      {/* Bottom: Total Members Badge (always show) */}
                      <div className="z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#16191e] text-[11px] font-bold text-[#9b9e9e] w-fit border border-[#2a2d33]">
                        <Users size={11} className="text-[#53fc18]" />
                        <span>{totalMembers} joined</span>
                      </div>
                    </div>

                    {/* Room Info Meta */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold text-white group-hover:text-[#53fc18] transition-colors truncate">
                          {room.name}
                        </h4>
                      </div>

                      <p className="text-xs text-[#9b9e9e] line-clamp-1">
                        {room.description || `${tag} • ${totalMembers} total member${totalMembers !== 1 ? 's' : ''}`}
                      </p>

                      <div className="flex items-center gap-2 pt-1">
                        <span className="px-2.5 py-0.5 rounded-md bg-[#0e0f13] border border-[#2a2d33] text-[10px] font-bold text-[#53fc18]">
                          {tag}
                        </span>
                        {room.subject && (
                          <span className="px-2.5 py-0.5 rounded-md bg-[#0e0f13] border border-[#2a2d33] text-[10px] font-bold text-[#9b9e9e]">
                            {room.subject}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="p-4 pt-0">
                    <button className="w-full py-2 rounded-xl bg-[#0e0f13] border border-[#2a2d33] group-hover:bg-[#53fc18] group-hover:text-black group-hover:font-extrabold text-xs font-bold text-[#e8eaed] transition-all flex items-center justify-center gap-1.5">
                      <span>Join Stage</span> <ArrowRight size={13} />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
