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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-zoom-dark border border-white/10 rounded-lg w-full max-w-[400px] p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Invite to Room</h2>
          <button onClick={onClose} className="w-5 h-5 rounded flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition">
            <X size={13} />
          </button>
        </div>

        <div className="mb-3">
          <label className="text-[11px] text-white/40 block mb-1">Room Code</label>
          <div className="bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-white font-mono text-sm tracking-wider text-center">
            {roomCode}
          </div>
        </div>

        <div className="mb-1">
          <label className="text-[11px] text-white/40 block mb-1">Share Link</label>
          <div className="flex gap-1.5">
            <input
              readOnly
              value={inviteLink}
              className="min-w-0 flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-[11px] font-mono focus:outline-none focus:border-zoom-blue truncate"
            />
            <button
              onClick={copyLink}
              className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded font-medium text-[11px] transition ${
                copied ? 'bg-green-600 text-white' : 'bg-zoom-blue text-white hover:bg-[#0b5fc7]'
              }`}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
