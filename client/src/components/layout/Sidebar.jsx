import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, Compass, Heart, Users, Settings,
  LogOut, ChevronDown, ChevronRight, Zap, History,
  Calendar, PenTool, BarChart3, BookOpen, Hash, Volume2, Plus, Video, Radio, Mic
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useState, useEffect } from 'react'
import { api } from '../../services/api'

// Subject → gradient class mapping
const SUBJECT_COLORS = {
  Math:        'room-thumb-math',
  Science:     'room-thumb-science',
  History:     'room-thumb-history',
  Language:    'room-thumb-language',
  Study:       'room-thumb-study',
  default:     'room-thumb-default',
}

const subjectThumb = (tags) => {
  if (!tags || !tags.length) return SUBJECT_COLORS.default
  const tag = tags[0]
  return SUBJECT_COLORS[tag] || SUBJECT_COLORS.default
}

// ── Nav links ──────────────────────────────────────────────────────────────
const TOP_NAV = [
  { label: 'Home',          path: '/',            icon: Home      },
  { label: 'Browse Rooms',  path: '/dashboard',   icon: Compass   },
  { label: 'Following',     path: '/history',     icon: Heart     },
]

const BOTTOM_NAV = [
  { label: 'My Whiteboards', path: '/whiteboards', icon: PenTool    },
  { label: 'Calendar',       path: '/calendar',    icon: Calendar   },
  { label: 'Flashcards',     path: '/flashcards',  icon: BookOpen   },
  { label: 'Study Stats',    path: '/stats',       icon: BarChart3  },
  { label: 'Settings',       path: '/settings',    icon: Settings   },
]

function SidebarContent({ onClose, collapsed }) {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [expandedRooms, setExpandedRooms] = useState({})
  const [showMore, setShowMore] = useState(false)

  useEffect(() => {
    api.getRooms().then((d) => {
      const fetchedRooms = d.rooms || []
      setRooms(fetchedRooms)
      // Expand first 3 rooms by default
      const initialExpanded = {}
      fetchedRooms.slice(0, 3).forEach((r) => {
        initialExpanded[r._id] = true
      })
      setExpandedRooms(initialExpanded)
    }).catch(() => {})
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const toggleRoomExpand = (roomId, e) => {
    e.preventDefault()
    e.stopPropagation()
    setExpandedRooms((prev) => ({ ...prev, [roomId]: !prev[roomId] }))
  }

  // Filter user's rooms (created or joined) vs public rooms
  const myRooms = rooms.filter((r) => r.host?._id === user?.id || r.members?.some((m) => m._id === user?.id || m === user?.id))
  const otherRooms = rooms.filter((r) => !myRooms.some((mr) => mr._id === r._id))
  const displayMyRooms = myRooms.length > 0 ? myRooms : rooms.slice(0, 4)

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        background: '#0e0f13',
        overflowX: 'hidden',
      }}
    >
      {/* ── Top primary nav ─────────────────────────────────── */}
      <nav style={{ padding: '8px 0', marginBottom: 4 }}>
        {TOP_NAV.map((item) => {
          const Icon = item.icon
          const active = pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`kick-nav-item${active ? ' active' : ''}`}
              style={collapsed ? {
                justifyContent: 'center',
                padding: '10px 0',
                gap: 0,
              } : {}}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                size={18}
                style={{ flexShrink: 0, color: active ? '#53fc18' : '#808a93' }}
              />
              {!collapsed && (
                <span style={{ color: active ? '#e8eaed' : undefined }}>
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── Divider ─────────────────────────────────────────── */}
      <div style={{ height: 1, background: '#2a2d33', margin: '4px 0' }} />

      {/* ── YOUR ROOMS (Discord-Style Channels List) ────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }} className="kick-scrollbar">
        {!collapsed && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 16px 6px',
          }}>
            <p style={{
              fontSize: 11, fontWeight: 800,
              color: '#808a93',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              YOUR ROOMS
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              title="Create or join a room"
              style={{
                background: 'rgba(83, 252, 24, 0.1)',
                border: 'none',
                borderRadius: 4,
                color: '#53fc18',
                cursor: 'pointer',
                padding: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              className="hover:bg-[#53fc18] hover:text-black transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
        )}

        {/* Discord Room Categories */}
        {displayMyRooms.map((room) => {
          const thumbClass = subjectThumb(room.tags || room.subjects)
          const activeUsers = room.activeUsers || room.participants || room.activeParticipants || []
          const activeCount = activeUsers.length || (room.isLive ? room.members?.length || 0 : 0)
          const isLive = activeCount > 0
          const isExpanded = expandedRooms[room._id]

          return (
            <div key={room._id} style={{ marginBottom: 6 }}>
              {/* Room Header / Category */}
              <div
                className="sidebar-channel-item group"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: collapsed ? '8px 0' : '6px 12px',
                  justifyContent: collapsed ? 'center' : 'space-between',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
                onClick={(e) => {
                  if (!collapsed) toggleRoomExpand(room._id, e)
                  else navigate(`/workspace/${room._id}`)
                }}
                title={collapsed ? room.name : undefined}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  {!collapsed && (
                    <span style={{ color: '#808a93', display: 'flex', alignItems: 'center' }}>
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                  )}
                  {/* Server Icon */}
                  <div
                    className={thumbClass}
                    style={{
                      width: 26, height: 26,
                      borderRadius: 8,
                      flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 800, color: '#fff',
                      position: 'relative',
                    }}
                  >
                    {(room.name || 'R')[0].toUpperCase()}
                    {isLive && (
                      <span style={{
                        position: 'absolute', bottom: -1, right: -1,
                        width: 8, height: 8,
                        background: '#53fc18',
                        border: '1.5px solid #0e0f13',
                        borderRadius: '50%',
                      }} className="animate-live-dot" />
                    )}
                  </div>

                  {!collapsed && (
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 13, fontWeight: 600,
                        color: '#e8eaed',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {room.name}
                      </p>
                    </div>
                  )}
                </div>

                {!collapsed && (
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    background: isLive ? 'rgba(83, 252, 24, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    color: isLive ? '#53fc18' : '#808a93',
                    padding: '1px 5px', borderRadius: 4,
                  }}>
                    {isLive ? 'LIVE' : 'OFFLINE'}
                  </span>
                )}
              </div>

              {/* Discord Channels List under this Room */}
              {!collapsed && isExpanded && (
                <div style={{ paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                  {/* Text Channel */}
                  <Link
                    to={`/workspace/${room._id}`}
                    onClick={onClose}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 8px', borderRadius: 4,
                      fontSize: 12, color: '#808a93',
                      textDecoration: 'none',
                      transition: 'all 0.15s',
                    }}
                    className="hover:bg-[#1e2228] hover:text-[#e8eaed]"
                  >
                    <Hash size={14} style={{ color: '#808a93', flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      general-chat
                    </span>
                  </Link>

                  {/* Voice / Video Channel */}
                  <Link
                    to={`/workspace/${room._id}`}
                    onClick={onClose}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 8px', borderRadius: 4,
                      fontSize: 12, color: isLive ? '#53fc18' : '#808a93',
                      background: isLive ? 'rgba(83, 252, 24, 0.05)' : 'transparent',
                      textDecoration: 'none',
                      transition: 'all 0.15s',
                      fontWeight: 500,
                    }}
                    className="hover:bg-[#1e2228]"
                  >
                    <Volume2 size={14} style={{ color: isLive ? '#53fc18' : '#808a93', flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Study Voice Stage
                    </span>
                    <span style={{ fontSize: 10, background: isLive ? '#1a3a0a' : '#1e2228', color: isLive ? '#53fc18' : '#808a93', padding: '0 4px', borderRadius: 3 }}>
                      {activeCount}
                    </span>
                  </Link>

                  {/* Active Participants inside Voice Channel (only rendered when active users exist) */}
                  {activeUsers.map((u, idx) => (
                    <div key={u._id || idx} style={{ paddingLeft: 20, display: 'flex', alignItems: 'center', gap: 6, py: 1 }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%',
                        background: '#53fc18', color: '#000',
                        fontSize: 9, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {(u.name || 'U')[0].toUpperCase()}
                      </div>
                      <span style={{ fontSize: 11, color: '#b0b8c1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.name || 'Member'}
                      </span>
                      <Mic size={10} style={{ color: '#53fc18', marginLeft: 'auto' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}


        {/* Public / Explore Rooms section */}
        {!collapsed && otherRooms.length > 0 && (
          <>
            <div style={{ height: 1, background: '#2a2d33', margin: '12px 0 8px' }} />
            <p style={{
              fontSize: 11, fontWeight: 800,
              color: '#808a93',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              padding: '0 16px 6px',
            }}>
              PUBLIC DISCORD CHANNELS
            </p>
            {otherRooms.slice(0, 5).map((room) => (
              <Link
                key={room._id}
                to={`/workspace/${room._id}`}
                onClick={onClose}
                className="sidebar-channel-item"
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px' }}
              >
                <Hash size={14} style={{ color: '#808a93' }} />
                <span style={{ fontSize: 12, color: '#b0b8c1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {room.name}
                </span>
                <span style={{ fontSize: 10, color: '#53fc18' }}>LIVE</span>
              </Link>
            ))}
          </>
        )}

        {/* ── Divider ── */}
        <div style={{ height: 1, background: '#2a2d33', margin: '8px 0' }} />

        {/* ── Bottom nav (secondary pages) ── */}
        {BOTTOM_NAV.map((item) => {
          const Icon = item.icon
          const active = pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`kick-nav-item${active ? ' active' : ''}`}
              style={collapsed ? {
                justifyContent: 'center',
                padding: '8px 0',
                gap: 0,
              } : {}}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={16} style={{ flexShrink: 0, color: active ? '#53fc18' : '#808a93' }} />
              {!collapsed && (
                <span style={{ fontSize: 13, color: active ? '#e8eaed' : undefined }}>
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* ── Bottom: user card ───────────────────────────────── */}
      <div style={{
        borderTop: '1px solid #2a2d33',
        padding: collapsed ? '12px 0' : '12px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        {/* Avatar */}
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: '#1a3a0a',
          border: '2px solid #53fc18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#53fc18',
          flexShrink: 0, overflow: 'hidden',
        }}>
          {user?.avatar
            ? <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initials}
        </div>
        {!collapsed && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#e8eaed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name || 'Member'}
              </p>
              <p style={{ fontSize: 11, color: '#808a93', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Log out"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 6, borderRadius: 6, color: '#808a93',
                transition: 'color 0.15s, background 0.15s',
                display: 'flex', alignItems: 'center',
              }}
              className="hover:bg-[#3a0a0a] hover:text-[#ff4f4f]"
            >
              <LogOut size={15} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main export ──────────────────────────────────────────────────────────────
export default function Sidebar({ open, onClose, collapsed, onCollapseToggle }) {
  const sidebarW = collapsed ? 60 : 240

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside
        className="hidden lg:block"
        style={{
          position: 'fixed',
          top: 56, left: 0, bottom: 0,
          width: sidebarW,
          background: '#0e0f13',
          borderRight: '1px solid #2a2d33',
          zIndex: 40,
          transition: 'width 0.25s cubic-bezier(0.22,1,0.36,1)',
          overflow: 'hidden',
        }}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.7)',
                zIndex: 40,
              }}
              className="lg:hidden"
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{
                position: 'fixed',
                top: 56, left: 0, bottom: 0,
                width: 240,
                background: '#0e0f13',
                borderRight: '1px solid #2a2d33',
                zIndex: 50,
              }}
              className="lg:hidden"
            >
              <SidebarContent onClose={onClose} collapsed={false} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
