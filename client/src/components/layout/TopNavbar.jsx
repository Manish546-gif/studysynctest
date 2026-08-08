import { motion } from 'framer-motion'
import { Bell, HelpCircle, Plus, Menu, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const navLinks = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Home', path: '/' },
]

export default function TopNavbar({ onToggleSidebar, sidebarOpen }) {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left */}
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl text-on-surface/70 hover:bg-surface-container-low transition-colors"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center">
              <span className="font-display text-sm font-bold text-on-primary-container">S</span>
            </div>
            <span className="font-display text-lg font-bold text-primary hidden sm:block">
              StudySync
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 ml-4">
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
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary-container rounded-xl text-sm font-semibold hover:shadow-md transition-shadow"
          >
            <Plus size={16} />
            Create Room
          </Link>

          <button className="relative p-2 rounded-xl text-on-surface/60 hover:text-on-surface hover:bg-surface-container-low transition-colors">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
          </button>

          <button className="p-2 rounded-xl text-on-surface/60 hover:text-on-surface hover:bg-surface-container-low transition-colors">
            <HelpCircle size={18} />
          </button>

          <Link
            to="/profile"
            className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-xs font-bold font-display hover:ring-2 hover:ring-primary/30 transition-shadow overflow-hidden"
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
