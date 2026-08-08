import { useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { api } from '../../services/api'

export default function ShareWhiteboardModal({ board, onClose }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [currentBoard, setCurrentBoard] = useState(board)

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
      const data = await api.shareWhiteboard(board._id, email.trim())
      setCurrentBoard(data.whiteboard)
      setEmail('')
      setMessage(`Shared with ${email.trim()}`)
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
      className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-full max-w-[28rem] bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/20">
          <div>
            <h3 className="font-display text-base font-bold text-on-surface">Share Whiteboard</h3>
            <p className="text-xs text-on-surface/40 mt-0.5">Invite others to collaborate on "{board.title}"</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface/40 hover:bg-surface-container transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <p className="text-xs font-medium text-on-surface/50 mb-2">Shareable link</p>
            <div className="flex items-center gap-2 bg-surface rounded-xl border border-outline-variant/20 p-2 pl-3">
              <p className="flex-1 text-xs text-on-surface/70 truncate">{shareUrl}</p>
              <button
                onClick={copyLink}
                className="px-3 py-1.5 bg-primary-container text-on-primary-container rounded-lg text-xs font-semibold hover:shadow-sm transition-shadow shrink-0"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-on-surface/50 mb-2">Share with a user</p>
            <form onSubmit={handleShare} className="flex items-center gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="friend@example.com"
                className="flex-1 px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface-container-lowest text-sm text-on-surface placeholder:text-on-surface/25 outline-none focus:border-primary-container"
              />
              <button
                type="submit"
                disabled={!email.trim() || status === 'sharing'}
                className="px-4 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {status === 'sharing' ? 'Sharing...' : 'Share'}
              </button>
            </form>
            {message && (
              <p className={`text-xs mt-2 ${status === 'error' ? 'text-error' : 'text-green-600'}`}>{message}</p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-on-surface/50 mb-2">
              Shared with ({currentBoard.sharedWith?.length || 0})
            </p>
            {currentBoard.sharedWith?.length ? (
              <div className="space-y-2">
                {(currentBoard.sharedWith || []).map((u) => (
                  <div key={u._id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-container transition-colors">
                    <div className="w-8 h-8 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center text-xs font-bold shrink-0">
                      {u.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-on-surface truncate">{u.name}</p>
                      <p className="text-[11px] text-on-surface/40 truncate">{u.email}</p>
                    </div>
                    <button
                      onClick={() => handleRemove(u._id)}
                      className="text-xs text-error/70 hover:text-error transition-colors shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-on-surface/30">Not shared with anyone yet.</p>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
