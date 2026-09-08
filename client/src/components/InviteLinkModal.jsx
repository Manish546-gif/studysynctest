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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={onClose}>
      <div className="bg-[#16191e] border border-[#2a2d33] rounded-2xl w-full max-w-[420px] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[#e8eaed]">Invite to Room</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-xl flex items-center justify-center text-[#9b9e9e] hover:text-[#e8eaed] hover:bg-[#2a2d33] transition">
            <X size={15} />
          </button>
        </div>

        <div className="mb-4">
          <label className="text-xs text-[#9b9e9e] font-semibold block mb-1.5 uppercase tracking-wider">Share Link</label>
          <div className="flex gap-2">
            <input
              readOnly
              value={inviteLink}
              className="min-w-0 flex-1 bg-[#0e0f13] border border-[#2a2d33] rounded-xl px-3 py-2 text-[#e8eaed] text-xs font-mono focus:outline-none focus:border-[#53fc18] truncate"
            />
            <button
              onClick={copyLink}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition ${
                copied ? 'bg-green-500 text-black' : 'bg-[#53fc18] text-black hover:bg-[#48de13]'
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="mb-1">
          <label className="text-xs text-[#9b9e9e] font-semibold block mb-1.5 uppercase tracking-wider">Add by username</label>
          <div className="flex items-center gap-2 bg-[#0e0f13] border border-[#2a2d33] rounded-xl px-3 py-2 focus-within:border-[#53fc18] transition-colors">
            <AtSign size={14} className="text-[#9b9e9e] shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by username or name"
              className="min-w-0 flex-1 bg-transparent text-[#e8eaed] text-xs outline-none placeholder:text-[#9b9e9e]/50"
            />
            {searching && <Loader2 size={14} className="text-[#53fc18] animate-spin shrink-0" />}
          </div>

          {inviteError && <p className="text-xs text-red-400 mt-1.5">{inviteError}</p>}

          {results.length > 0 && (
            <div className="mt-2.5 max-h-48 overflow-y-auto bg-[#0e0f13] border border-[#2a2d33] rounded-xl space-y-1 p-1.5">
              {results.map((u) => (
                <div key={u._id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[#16191e] transition-colors">
                  <div className="w-7 h-7 rounded-xl bg-[#53fc18]/15 border border-[#53fc18]/30 flex items-center justify-center text-[#53fc18] text-xs font-bold shrink-0">
                    {(u.username || u.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#e8eaed] truncate">@{u.username}</p>
                    <p className="text-[10px] text-[#9b9e9e] truncate">{u.name}</p>
                  </div>
                  <button
                    onClick={() => handleInvite(u)}
                    disabled={invitingId === u._id}
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#53fc18] text-black hover:bg-[#48de13] transition disabled:opacity-50"
                  >
                    {invitingId === u._id ? <Loader2 size={12} className="animate-spin" /> : justInvited === u.username ? <Check size={12} /> : <UserPlus size={12} />}
                    {justInvited === u.username ? 'Added' : invitingId === u._id ? 'Adding' : 'Add'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {!searching && query.trim() && results.length === 0 && (
            <p className="text-xs text-[#9b9e9e]/60 mt-2 text-center py-2">No users found</p>
          )}
        </div>
      </div>
    </div>
  )
}
