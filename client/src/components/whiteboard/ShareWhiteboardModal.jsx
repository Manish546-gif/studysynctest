import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Globe, Eye, Pencil, Link2 } from 'lucide-react'
import { api } from '../../services/api'

const LINK_OPTIONS = [
  { value: 'none', label: 'Off', icon: X },
  { value: 'view', label: 'Can view', icon: Eye },
  { value: 'edit', label: 'Can edit', icon: Pencil },
]

export default function ShareWhiteboardModal({ board, onClose }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('editor')
  const [status, setStatus] = useState('')
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [currentBoard, setCurrentBoard] = useState(board)

  const entries = currentBoard.sharedWith || []
  const shareUrl = `${window.location.origin}/whiteboards/${board._id}`

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('sharing')
    setMessage('')
    try {
      const data = await api.shareWhiteboard(board._id, email.trim(), role)
      setCurrentBoard(data.whiteboard)
      setEmail('')
      setMessage(`Shared with ${email.trim()} (${role})`)
      setStatus('')
    } catch (err) {
      setMessage(err.message)
      setStatus('error')
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    try {
      const data = await api.setShareRole(board._id, userId, newRole)
      setCurrentBoard(data.whiteboard)
    } catch (err) {
      setMessage(err.message)
      setStatus('error')
    }
  }

  const handleLinkAccess = async (access) => {
    try {
      const data = await api.setLinkAccess(board._id, access)
      setCurrentBoard(data.whiteboard)
      setMessage('')
      setStatus('')
    } catch (err) {
      setMessage(err.message)
      setStatus('error')
    }
  }

  const handleRemove = async (userId) => {
    try {
      const data = await api.unshareWhiteboard(board._id, userId)
      setCurrentBoard(data.whiteboard)
    } catch (err) {
      setMessage(err.message)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-full max-w-[28rem] bg-[#2b2935] rounded-xl border border-white/10 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h3 className="text-base font-semibold text-white">Share Whiteboard</h3>
            <p className="text-xs text-white/40 mt-0.5">Invite others to collaborate on "{board.title}"</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:bg-white/10 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Globe size={12} className="text-white/40" />
              <p className="text-xs font-medium text-white/50">Anyone with the link</p>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0 bg-white/5 rounded-lg border border-white/10 p-2 pl-3">
                <Link2 size={13} className="text-white/30 shrink-0" />
                <p className="flex-1 text-xs text-white/70 truncate">{shareUrl}</p>
                <button
                  onClick={copyLink}
                  className="px-3 py-1.5 bg-[#0f71ef] text-white rounded-lg text-xs font-semibold hover:bg-[#0d62cc] transition-colors shrink-0"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-white/5 rounded-lg border border-white/10 p-1">
              {LINK_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => handleLinkAccess(value)}
                  disabled={currentBoard.linkAccess === value}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    currentBoard.linkAccess === value
                      ? 'bg-[#0f71ef] text-white'
                      : 'text-white/50 hover:bg-white/10'
                  }`}
                >
                  <Icon size={12} /> {label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-white/30 mt-1.5">
              {currentBoard.linkAccess === 'none'
                ? 'Only people you invite can open this board.'
                : currentBoard.linkAccess === 'view'
                  ? 'Signed-in users with the link can view this board.'
                  : 'Signed-in users with the link can view and edit this board.'}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-white/50 mb-2">Share with a user</p>
            <form onSubmit={handleShare} className="flex items-center gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="friend@example.com"
                className="flex-1 px-4 py-2.5 rounded-lg border border-white/15 bg-white/5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#0f71ef]"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-[42px] px-2 rounded-lg border border-white/15 bg-white/5 text-xs text-white outline-none cursor-pointer focus:border-[#0f71ef]"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                type="submit"
                disabled={!email.trim() || status === 'sharing'}
                className="px-4 py-2.5 bg-[#0f71ef] text-white rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-[#0d62cc] transition-colors"
              >
                {status === 'sharing' ? '...' : 'Share'}
              </button>
            </form>
            {message && (
              <p className={`text-xs mt-2 ${status === 'error' ? 'text-red-400' : 'text-green-400'}`}>{message}</p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-white/50 mb-2">
              Shared with ({entries.length})
            </p>
            {entries.length ? (
              <div className="space-y-2">
                {entries.map((e) => {
                  const u = e.user || {}
                  return (
                    <div key={u._id || String(u)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {u.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{u.name}</p>
                        <p className="text-[11px] text-white/40 truncate">{u.email}</p>
                      </div>
                      <select
                        value={e.role || 'editor'}
                        onChange={(ev) => handleRoleChange(u._id, ev.target.value)}
                        className="h-8 px-1.5 rounded-lg border border-white/15 bg-white/5 text-[11px] text-white/70 outline-none cursor-pointer"
                        title="Change role"
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        onClick={() => handleRemove(u._id)}
                        className="text-xs text-red-400/70 hover:text-red-400 transition-colors shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-white/30">Not shared with anyone yet.</p>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
