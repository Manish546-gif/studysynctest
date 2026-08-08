import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  Play,
  LogOut,
  PenTool,
  History,
  Sparkles,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const sections = [
  {
    label: 'Workspace',
    items: [
      { label: 'Home', path: '/', icon: LayoutDashboard },
      { label: 'My Rooms', path: '/dashboard', icon: Users },
      { label: 'My Whiteboard', path: '/whiteboards', icon: PenTool },
    ],
  },
  {
    label: 'Track',
    items: [
      { label: 'History', path: '/history', icon: History },
      { label: 'Calendar', path: '/calendar', icon: Calendar },
    ],
  },
  {
    label: 'Account',
    items: [{ label: 'Settings', path: '/settings', icon: Settings }],
  },
]

function SidebarContent({ onClose }) {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-full bg-surface-container-lowest/60">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-outline-variant/30 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-tertiary flex items-center justify-center shadow-lg shadow-primary/20">
          <Sparkles size={16} className="text-on-primary" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="font-display text-[15px] font-bold text-on-surface tracking-tight">StudySync</span>
          <span className="text-[9px] font-medium text-on-surface/40 tracking-[0.18em] uppercase">Learn together</span>
        </div>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold text-on-surface/35 uppercase tracking-[0.16em]">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const active = pathname === item.path
                return (
                  <Link
                    key={item.label}
                    to={item.path}
                    onClick={onClose}
                    className={`group flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                      active
                        ? 'bg-primary-container/60 text-on-primary-container font-semibold'
                        : 'text-on-surface/55 hover:bg-surface-container hover:text-on-surface'
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        active
                          ? 'bg-primary text-on-primary shadow-md shadow-primary/30'
                          : 'bg-surface-container group-hover:bg-surface-container-high'
                      }`}
                    >
                      <Icon size={16} />
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {active && <ChevronRight size={14} className="text-on-primary-container/50" />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-3">
        <div className="mx-1 p-4 mesh-card rounded-2xl hairline">
          <p className="text-[10px] font-semibold text-on-surface/40 uppercase tracking-widest mb-1">
            Usage
          </p>
          <p className="text-sm font-display font-bold text-primary">Pro Plan</p>
          <div className="mt-3 h-1.5 bg-outline-variant/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-tertiary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: '75%' }}
              transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <p className="text-[11px] text-on-surface/40 mt-1.5">3 of 4 rooms used</p>
        </div>

        <Link
          to="/dashboard"
          onClick={onClose}
          className="press flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-primary to-tertiary text-on-primary rounded-xl text-sm font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
        >
          <Play size={16} />
          Start Session
        </Link>

        {/* User card */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container hairline">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-container to-secondary-container flex items-center justify-center text-xs font-bold font-display text-on-primary-container overflow-hidden shrink-0">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-on-surface truncate">{user?.name || 'Member'}</p>
            <p className="text-[10px] text-on-surface/40 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="press w-8 h-8 rounded-lg flex items-center justify-center text-on-surface/40 hover:bg-error-container hover:text-error transition-colors"
            title="Log out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Sidebar({ open, onClose }) {
  return (
    <>
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 w-64 flex-col bg-surface-container-low border-r border-outline-variant/30 z-40">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-inverse-surface/30 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 bottom-0 w-64 flex flex-col bg-surface-container-low border-r border-outline-variant/30 z-50 lg:hidden"
            >
              <SidebarContent onClose={onClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
