import { useEffect, useRef, useState } from 'react'
import { Copy, Check, X, UserPlus, Loader2, AtSign } from 'lucide-react'
import { api } from '../services/api'

export default function InviteLinkModal({ roomId, roomCode, onInvite, onClose }) {
  const [copied, setCopied] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [invitingId, setInvitingId] = useState(null)
  const [inviteError, setInviteError] = useState('')
  const [justInvited, setJustInvited] = useState(null)
  const debounceRef = useRef(null)

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

  useEffect(() => {
    clearTimeout(debounceRef.current)
    const q = query.trim()
    if (!q) { setResults([]); return }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.searchUsers(q)
        setResults(Array.isArray(data?.users) ? data.users : [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  const handleInvite = async (u) => {
    setInviteError('')
    setInvitingId(u._id)
    try {
      if (onInvite) {
        await onInvite(u.username)
      } else {
        await api.inviteUser(roomId, u.username)
      }
      setJustInvited(u.username)
      setTimeout(() => setJustInvited(null), 2000)
    } catch (err) {
      setInviteError(err.message || 'Failed to invite')
    } finally {
      setInvitingId(null)
    }
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

        <div className="mb-1">
          <label className="text-[11px] text-white/40 block mb-1">Add by username</label>
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded px-2.5 py-1.5 focus-within:border-zoom-blue transition-colors">
            <AtSign size={12} className="text-white/30 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by username or name"
              className="min-w-0 flex-1 bg-transparent text-white text-[11px] outline-none placeholder:text-white/30"
            />
            {searching && <Loader2 size={12} className="text-zoom-blue animate-spin shrink-0" />}
          </div>

          {inviteError && <p className="text-[10px] text-red-400 mt-1">{inviteError}</p>}

          {results.length > 0 && (
            <div className="mt-1.5 max-h-40 overflow-y-auto bg-white/5 border border-white/10 rounded space-y-1 p-1">
              {results.map((u) => (
                <div key={u._id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/10 transition-colors">
                  <div className="w-6 h-6 rounded bg-zoom-blue/20 flex items-center justify-center text-white text-[10px] font-medium shrink-0">
                    {(u.username || u.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-white/80 truncate">@{u.username}</p>
                    <p className="text-[9px] text-white/40 truncate">{u.name}</p>
                  </div>
                  <button
                    onClick={() => handleInvite(u)}
                    disabled={invitingId === u._id}
                    className="shrink-0 flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-zoom-blue text-white hover:bg-[#0b5fc7] transition disabled:opacity-50"
                  >
                    {invitingId === u._id ? <Loader2 size={10} className="animate-spin" /> : justInvited === u.username ? <Check size={10} /> : <UserPlus size={10} />}
                    {justInvited === u.username ? 'Added' : invitingId === u._id ? 'Adding' : 'Add'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {!searching && query.trim() && results.length === 0 && (
            <p className="text-[10px] text-white/30 mt-1">No users found</p>
          )}
        </div>
      </div>
    </div>
  )
}
