import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, Plus, Menu, X, Search, Sun, Moon, Sparkles } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { applyTheme, getStoredTheme } from '../../utils/appearance'

const navLinks = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Home', path: '/' },
]

export default function TopNavbar({ onToggleSidebar, sidebarOpen }) {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const [theme, setTheme] = useState(getStoredTheme())
  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'

  useEffect(() => {
    setTheme(getStoredTheme())
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
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-tertiary flex items-center justify-center shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-shadow">
              <Sparkles size={16} className="text-on-primary" />
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

          {/* Command search */}
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
            className="press hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-tertiary text-on-primary rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/35 transition-shadow"
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

          <button className="relative p-2.5 rounded-xl text-on-surface/60 hover:text-on-surface hover:bg-surface-container-low transition-colors">
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full ring-2 ring-surface" />
          </button>

          <Link
            to="/profile"
            className="press w-9 h-9 rounded-full bg-gradient-to-br from-primary-container to-secondary-container flex items-center justify-center text-on-primary-container text-xs font-bold font-display hover:ring-2 hover:ring-primary/40 transition-shadow overflow-hidden"
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
