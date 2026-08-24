import { useState } from 'react'
import { Copy, Check, X } from 'lucide-react'

export default function InviteLinkModal({ roomId, roomCode, onClose }) {
  const [copied, setCopied] = useState(false)

  const inviteLink = `${window.location.origin}/workspace/${roomId}?invite=true`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = inviteLink
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-surface-container-high border border-outline-variant/20 rounded-2xl w-full max-w-[420px] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-on-surface">Invite to Room</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface/40 hover:bg-surface-container transition">
            <X size={18} />
          </button>
        </div>

        <div className="mb-4">
          <label className="text-sm text-on-surface/60 block mb-1">Room Code</label>
          <div className="bg-surface border border-outline-variant/30 rounded-lg px-4 py-2.5 text-on-surface font-mono text-lg tracking-wider text-center">
            {roomCode}
          </div>
        </div>

        <div className="mb-6">
          <label className="text-sm text-on-surface/60 block mb-1">Share Link</label>
          <div className="flex gap-2">
            <input
              readOnly
              value={inviteLink}
              className="min-w-0 flex-1 bg-surface border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface text-xs font-mono focus:outline-none focus:border-primary truncate"
            />
            <button
              onClick={copyLink}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm transition ${
                copied ? 'bg-success text-on-primary' : 'bg-primary text-on-primary hover:bg-primary/90'
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
