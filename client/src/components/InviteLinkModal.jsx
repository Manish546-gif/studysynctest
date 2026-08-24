export default function InviteLinkModal({ roomId, roomCode, onClose }) {
  const [copied, setCopied] = useState(false)

  const inviteLink = `${window.location.origin}/workspace/${roomId}?invite=true`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const ta = document.createElement('textarea')
      ta.value = inviteLink
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-white mb-4">Invite to Room</h2>

        <div className="mb-4">
          <label className="text-sm text-white/60 block mb-1">Room Code</label>
          <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-lg tracking-wider">
            {roomCode}
          </div>
        </div>

        <div className="mb-6">
          <label className="text-sm text-white/60 block mb-1">Share Link</label>
          <div className="flex gap-2">
            <input
              readOnly
              value={inviteLink}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm font-mono focus:outline-none"
            />
            <button
              onClick={copyLink}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                copied ? 'bg-green-600 text-white' : 'bg-purple-600 hover:bg-purple-500 text-white'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <button onClick={onClose} className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition">
          Close
        </button>
      </div>
    </div>
  )
}
