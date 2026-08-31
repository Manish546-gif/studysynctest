import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Plus, Menu, X, Search, Sun, Moon, Sparkles, CheckCheck, Trash2, Users, Upload, PenTool, MessageSquare } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'
import { applyTheme, getStoredTheme } from '../../utils/appearance'

const navLinks = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Home', path: '/' },
]

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
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function TopNavbar({ onToggleSidebar, sidebarOpen }) {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const { notifications, unreadCount, markRead, markAllRead, removeNotification } = useNotifications()
  const [theme, setTheme] = useState(getStoredTheme())
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)
  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'

  useEffect(() => {
    setTheme(getStoredTheme())
  }, [])

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }

  const isDark = theme === 'dark'

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 glass border-b border-outline-variant/40">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl text-on-surface/70 hover:bg-surface-container-low transition-colors"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-shadow">
              <Sparkles size={16} className="text-on-primary-container" />
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="font-display text-[15px] font-bold text-on-surface tracking-tight">
                StudySync
              </span>
              <span className="text-[9px] font-medium text-on-surface/40 tracking-[0.18em] uppercase">
                Learn together
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-2 ml-2 w-56 lg:w-72 h-10 px-3 rounded-xl bg-surface-container-low hairline text-on-surface/35 transition-colors focus-within:text-on-surface/60">
            <Search size={15} className="shrink-0" />
            <span className="text-sm">Search rooms…</span>
            <kbd className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-surface-container text-on-surface/45 border border-outline-variant/60">
              ⌘K
            </kbd>
          </div>

          <nav className="hidden lg:flex items-center gap-1 ml-2">
            {navLinks.map((link) => {
              const active = pathname === link.path
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className="relative px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  {active && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-primary-container rounded-xl"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span
                    className={`relative z-10 ${
                      active ? 'text-on-primary-container font-semibold' : 'text-on-surface/60 hover:text-on-surface'
                    }`}
                  >
                    {link.label}
                  </span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard"
            className="press hidden sm:flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/35 transition-shadow"
          >
            <Plus size={16} />
            Create Room
          </Link>

          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl text-on-surface/60 hover:text-on-surface hover:bg-surface-container-low transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Notification bell */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen(!open)}
              className="relative p-2.5 rounded-xl text-on-surface/60 hover:text-on-surface hover:bg-surface-container-low transition-colors"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-primary text-on-primary text-[9px] font-bold rounded-full ring-2 ring-surface">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] max-h-[420px] bg-surface-container-low rounded-2xl shadow-xl shadow-inverse-surface/10 border border-outline-variant/30 overflow-hidden flex flex-col"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
                    <h3 className="font-display text-sm font-bold text-on-surface">Notifications</h3>
                    <div className="flex items-center gap-1">
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors">
                          <CheckCheck size={12} />
                          Mark all read
                        </button>
                      )}
                      <button
                        onClick={() => setOpen(false)}
                        className="ml-2 p-1.5 rounded-lg text-on-surface/40 hover:text-on-surface hover:bg-surface-container transition-colors"
                        aria-label="Close notifications"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="overflow-y-auto flex-1">
                    {notifications.length === 0 ? (
                      <div className="py-12 text-center">
                        <Bell size={28} className="mx-auto text-on-surface/15 mb-2" />
                        <p className="text-sm text-on-surface/35">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((n) => {
                        const Icon = typeIcons[n.type] || Bell
                        return (
                          <div
                            key={n._id}
                            className={`flex items-start gap-3 px-4 py-3 border-b border-outline-variant/10 transition-colors ${
                              !n.read ? 'bg-primary/5' : 'hover:bg-surface-container'
                            }`}
                            onClick={() => { if (!n.read) markRead(n._id) }}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              !n.read ? 'bg-primary-container' : 'bg-surface-container-high'
                            }`}>
                              <Icon size={14} className={!n.read ? 'text-on-primary-container' : 'text-on-surface/40'} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs leading-relaxed ${!n.read ? 'font-semibold text-on-surface' : 'text-on-surface/70'}`}>
                                {n.title}
                              </p>
                              {n.body && <p className="text-[11px] text-on-surface/35 mt-0.5">{n.body}</p>}
                              <p className="text-[10px] text-on-surface/30 mt-1">{timeAgo(n.createdAt)}</p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); removeNotification(n._id) }}
                              className="shrink-0 mt-0.5 p-1 rounded-md text-on-surface/20 hover:text-error hover:bg-error-container/30 transition-colors"
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

          <Link
            to="/profile"
            className="press w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-xs font-bold font-display hover:ring-2 hover:ring-primary/40 transition-shadow overflow-hidden"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : initials}
          </Link>
        </div>
      </div>
    </header>
  )
}
