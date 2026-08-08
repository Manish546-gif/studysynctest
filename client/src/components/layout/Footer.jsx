import { Link } from 'react-router-dom'

const links = [
  { label: 'Privacy', path: '/privacy' },
  { label: 'Terms', path: '/terms' },
  { label: 'Cookies', path: '/cookies' },
  { label: 'Contact', path: '/contact' },
]

export default function Footer() {
  return (
    <footer className="bg-surface-container-low border-t border-outline-variant/30 py-8 px-6 lg:px-12 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-bold text-primary">StudySync</span>
          <span className="text-xs text-on-surface/35">&copy; {new Date().getFullYear()}</span>
        </div>
        <nav className="flex items-center gap-4 flex-wrap justify-center">
          {links.map((l) => (
            <Link
              key={l.path}
              to={l.path}
              className="text-xs text-on-surface/40 hover:text-on-surface transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
