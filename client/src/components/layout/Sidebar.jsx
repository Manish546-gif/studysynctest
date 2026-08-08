import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  Settings,
  Play,
  HelpCircle,
  LogOut,
  PenTool,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const navItems = [
  { label: 'Home', path: '/', icon: LayoutDashboard },
  { label: 'My Rooms', path: '/dashboard', icon: Users },
  { label: 'My Whiteboard', path: '/whiteboards', icon: PenTool },
  { label: 'History', path: '/history', icon: BookOpen },
  { label: 'Calendar', path: '/calendar', icon: Calendar },
  { label: 'Settings', path: '/settings', icon: Settings },
]

export default function Sidebar({ open, onClose }) {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const content = (
    <div className="flex flex-col h-full">
      <div className="h-16 shrink-0" />

      <div className="px-3 pt-4 pb-2">
        <div className="mx-1 p-4 bg-surface-container-low rounded-2xl">
          <p className="text-[10px] font-semibold text-on-surface/40 uppercase tracking-widest mb-1">
            StudySync
          </p>
          <p className="text-sm font-display font-bold text-primary">Pro Plan</p>
          <div className="mt-3 h-1.5 bg-outline-variant/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: '75%' }}
              transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <p className="text-[11px] text-on-surface/40 mt-1.5">3 of 4 rooms used</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.path
          return (
            <Link
              key={item.label}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                active
                  ? 'bg-primary-container text-on-primary-container font-semibold'
                  : 'text-on-surface/55 hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 pb-4 space-y-2">
        <Link
          to="/dashboard"
          onClick={onClose}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-secondary text-on-secondary rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-secondary/20 active:scale-[0.98] transition-all"
        >
          <Play size={16} />
          Start Session
        </Link>

        <div className="pt-2 border-t border-outline-variant/20 space-y-0.5">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-on-surface/50 hover:bg-surface-container-low hover:text-on-surface transition-colors"
          >
            <HelpCircle size={18} />
            Help Center
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-on-surface/50 hover:bg-error-container hover:text-error transition-colors"
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 w-64 flex-col bg-surface-container-low border-r border-outline-variant/30 z-40">
        {content}
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
              {content}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
