import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, Plus, Menu, X, Search, CheckCheck, Trash2,
  Users, Upload, PenTool, MessageSquare, Zap, Globe,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'
import { useSidebar } from './AppLayout'

const typeIcons = {
  room_joined: Users,
  room_created: Users,
  file_uploaded: Upload,
  whiteboard_shared: PenTool,
  chat_message: MessageSquare,
}

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function TopNavbar({ onToggleSidebar, sidebarOpen }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { notifications, unreadCount, markRead, markAllRead, removeNotification } = useNotifications()
  const { collapsed, setCollapsed } = useSidebar()
  const [notifOpen, setNotifOpen] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const dropdownRef = useRef(null)
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  // Close notif on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchVal.trim()) navigate(`/dashboard?q=${encodeURIComponent(searchVal.trim())}`)
  }

  return (
    <header
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: 56,
        background: '#0e0f13',
        borderBottom: '1px solid #2a2d33',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 16px',
      }}
    >
      {/* ── Left: hamburger + logo ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {/* Desktop collapse toggle */}
        <button
          onClick={() => setCollapsed((p) => !p)}
          className="hidden lg:flex items-center justify-center w-9 h-9 rounded-md text-[#808a93] hover:text-[#e8eaed] hover:bg-[#1e2228] transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>

        {/* Mobile open toggle */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden flex items-center justify-center w-9 h-9 rounded-md text-[#808a93] hover:text-[#e8eaed] hover:bg-[#1e2228] transition-colors"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img
            src="/logo.png"
            alt="StudySync Logo"
            style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'contain' }}
          />
          <span
            className="hidden sm:block"
            style={{ fontWeight: 900, fontSize: 18, color: '#e8eaed', letterSpacing: '-0.02em' }}
          >
            StudySync
          </span>
          <span
            style={{
              fontSize: 10, fontWeight: 800,
              background: '#1e2228',
              border: '1px solid #3a4048',
              color: '#53fc18',
              borderRadius: 4,
              padding: '1px 6px',
              letterSpacing: '0.06em',
            }}
            className="hidden sm:block"
          >
            BETA
          </span>
        </Link>
      </div>

      {/* ── Center: Search bar ── */}
      <form
        onSubmit={handleSearch}
        style={{ flex: 1, maxWidth: 480, margin: '0 auto' }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#16191e',
          border: '1px solid #2a2d33',
          borderRadius: 6,
          padding: '0 12px',
          height: 36,
          transition: 'border-color 0.15s ease',
        }}
          className="focus-within:[border-color:#53fc18]"
        >
          <Search size={15} color="#808a93" style={{ flexShrink: 0 }} />
          <input
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Search rooms, subjects..."
            style={{
              flex: 1, background: 'transparent',
              border: 'none', outline: 'none',
              fontSize: 14, color: '#e8eaed',
            }}
            className="placeholder:text-[#808a93]"
          />
        </div>
      </form>

      {/* ── Right: actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {/* Globe (public rooms) */}
        <Link
          to="/"
          style={{ textDecoration: 'none' }}
          className="hidden md:flex items-center justify-center w-9 h-9 rounded-md text-[#808a93] hover:text-[#e8eaed] hover:bg-[#1e2228] transition-colors"
          title="Browse public rooms"
        >
          <Globe size={18} />
        </Link>

        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative flex items-center justify-center w-9 h-9 rounded-md text-[#808a93] hover:text-[#e8eaed] hover:bg-[#1e2228] transition-colors"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 6, right: 6,
                width: 8, height: 8,
                background: '#53fc18',
                borderRadius: '50%',
                border: '2px solid #0e0f13',
              }} />
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 8,
                  width: 320,
                  background: '#16191e',
                  border: '1px solid #2a2d33',
                  borderRadius: 8,
                  boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                  overflow: 'hidden',
                  display: 'flex', flexDirection: 'column',
                  maxHeight: 400,
                  zIndex: 100,
                }}
              >
                {/* Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: '1px solid #2a2d33',
                }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#e8eaed' }}>
                    Notifications
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#53fc18', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        <CheckCheck size={12} /> Mark all read
                      </button>
                    )}
                    <button
                      onClick={() => setNotifOpen(false)}
                      className="text-[#808a93] hover:text-[#e8eaed] transition-colors"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* List */}
                <div style={{ overflowY: 'auto', flex: 1 }} className="kick-scrollbar">
                  {notifications.length === 0 ? (
                    <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                      <Bell size={24} color="#3a4048" style={{ margin: '0 auto 8px' }} />
                      <p style={{ fontSize: 13, color: '#3a4048' }}>No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const Icon = typeIcons[n.type] || Bell
                      return (
                        <div
                          key={n._id}
                          onClick={() => { if (!n.read) markRead(n._id) }}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            padding: '10px 16px',
                            borderBottom: '1px solid #2a2d33',
                            background: !n.read ? 'rgba(83,252,24,0.04)' : 'transparent',
                            cursor: 'pointer',
                          }}
                          className="hover:bg-[#1e2228] transition-colors"
                        >
                          <div style={{
                            width: 32, height: 32, borderRadius: 6,
                            background: !n.read ? '#1a3a0a' : '#1e2228',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <Icon size={14} color={!n.read ? '#53fc18' : '#808a93'} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                              fontSize: 12, lineHeight: 1.5,
                              color: !n.read ? '#e8eaed' : '#808a93',
                              fontWeight: !n.read ? 600 : 400,
                            }}>{n.title}</p>
                            {n.body && <p style={{ fontSize: 11, color: '#3a4048', marginTop: 2 }}>{n.body}</p>}
                            <p style={{ fontSize: 10, color: '#3a4048', marginTop: 4 }}>{timeAgo(n.createdAt)}</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeNotification(n._id) }}
                            className="text-[#3a4048] hover:text-[#ff4f4f] transition-colors"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Log in button */}
        <span
          className="hidden md:block text-[#e8eaed] text-sm font-medium cursor-pointer hover:text-white transition-colors"
          style={{ padding: '0 4px' }}
        >
          {/* placeholder — user is already logged in */}
        </span>

        {/* Create Room — volt-green pill (Kick "Sign Up" equivalent) */}
        <Link
          to="/dashboard"
          className="btn-kick press hidden sm:inline-flex"
          style={{ fontSize: 13, padding: '7px 14px' }}
        >
          <Plus size={15} />
          New Room
        </Link>

        {/* Avatar */}
        <Link
          to="/profile"
          style={{
            width: 34, height: 34,
            borderRadius: '50%',
            background: '#1a3a0a',
            border: '2px solid #53fc18',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#53fc18',
            textDecoration: 'none',
            overflow: 'hidden',
            flexShrink: 0,
            transition: 'box-shadow 0.15s ease',
          }}
          className="hover:shadow-[0_0_0_2px_#53fc18] transition-shadow"
        >
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : initials}
        </Link>
      </div>
    </header>
  )
}
