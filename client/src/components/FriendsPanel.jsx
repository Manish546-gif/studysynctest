import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, UserPlus, UserCheck, UserX, Search,
  X, ChevronRight, Circle, Loader2, Send, UserMinus,
} from 'lucide-react'
import { api } from '../services/api'
import { getAssetUrl } from '../services/api'
import { useNavigate } from 'react-router-dom'

function Avatar({ user, size = 8 }) {
  const url = getAssetUrl(user?.avatar)
  const initials = (user?.name || user?.username || '?').slice(0, 1).toUpperCase()
  return url ? (
    <img src={url} alt={user?.name} className={`w-${size} h-${size} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`w-${size} h-${size} rounded-full bg-[#2a2d33] flex items-center justify-center shrink-0 text-xs font-bold text-[#9b9e9e]`}>
      {initials}
    </div>
  )
}

function OnlineDot({ online }) {
  return (
    <span
      className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#16191e]"
      style={{ background: online ? '#53fc18' : '#4b5563' }}
    />
  )
}

export default function FriendsPanel({ isOpen, onClose, socket, currentRoomId }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState('friends') // friends | requests | search
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([])
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [onlineIds, setOnlineIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [actionStates, setActionStates] = useState({})
  const [incomingRequest, setIncomingRequest] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getFriends()
      setFriends(data.friends || [])
      setRequests(data.requests || [])
    } catch (_) {}
    setLoading(false)
  }, [])

  useEffect(() => { if (isOpen) load() }, [isOpen, load])

  // Socket events
  useEffect(() => {
    if (!socket) return
    const onReq = ({ from }) => {
      setIncomingRequest(from)
      setRequests(prev => [...prev, { from, sentAt: new Date() }])
    }
    const onAccepted = ({ by }) => {
      setFriends(prev => [...prev, by])
    }
    socket.on('friend-request-received', onReq)
    socket.on('friend-request-accepted', onAccepted)
    return () => {
      socket.off('friend-request-received', onReq)
      socket.off('friend-request-accepted', onAccepted)
    }
  }, [socket])

  // Search
  useEffect(() => {
    if (searchQ.trim().length < 2) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await api.searchFriends(searchQ.trim())
        setSearchResults(data.users || [])
      } catch (_) {}
      setSearching(false)
    }, 350)
    return () => clearTimeout(t)
  }, [searchQ])

  const setAction = (id, state) => setActionStates(prev => ({ ...prev, [id]: state }))

  const sendRequest = async (userId) => {
    setAction(userId, 'loading')
    try {
      await api.sendFriendRequest(userId)
      socket?.emit('friend-request-sent', { targetUserId: userId })
      setAction(userId, 'sent')
    } catch (e) {
      setAction(userId, null)
      alert(e.message)
    }
  }

  const acceptRequest = async (fromId) => {
    setAction(fromId, 'loading')
    try {
      const data = await api.acceptFriendRequest(fromId)
      socket?.emit('friend-request-accepted', { targetUserId: fromId })
      setRequests(prev => prev.filter(r => r.from._id !== fromId))
      if (data.friend) setFriends(prev => [...prev, data.friend])
      setAction(fromId, null)
    } catch (e) { setAction(fromId, null) }
  }

  const declineRequest = async (fromId) => {
    try {
      await api.declineFriendRequest(fromId)
      setRequests(prev => prev.filter(r => r.from._id !== fromId))
    } catch (_) {}
  }

  const unfriend = async (userId) => {
    if (!confirm('Remove this friend?')) return
    try {
      await api.unfriend(userId)
      setFriends(prev => prev.filter(f => f._id !== userId))
    } catch (_) {}
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed right-0 top-0 h-full w-80 z-40 border-l border-[#2a2d33] flex flex-col shadow-2xl"
      style={{ background: '#16191e' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#2a2d33]">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-[#53fc18]" />
          <h2 className="text-sm font-bold text-[#e8eaed]">Friends</h2>
          {requests.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#53fc18] text-black font-bold">
              {requests.length}
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-[#9b9e9e] hover:text-[#e8eaed] transition-colors">
          <X size={15} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2a2d33]">
        {[
          { id: 'friends', label: 'Friends', count: friends.length },
          { id: 'requests', label: 'Requests', count: requests.length },
          { id: 'search', label: 'Add', count: 0 },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors relative ${tab === t.id ? 'text-[#53fc18]' : 'text-[#9b9e9e] hover:text-[#e8eaed]'}`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-1 text-[9px] px-1 py-0.5 rounded-full bg-[#2a2d33]">{t.count}</span>
            )}
            {tab === t.id && (
              <motion.div layoutId="ftab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#53fc18]" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="text-[#9b9e9e] animate-spin" />
          </div>
        ) : (
          <>
            {/* Friends List */}
            {tab === 'friends' && (
              <div className="py-2">
                {friends.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <Users size={32} className="mx-auto text-[#9b9e9e]/30 mb-3" />
                    <p className="text-sm text-[#9b9e9e]">No friends yet</p>
                    <p className="text-xs text-[#9b9e9e]/50 mt-1">Search for users to add them</p>
                  </div>
                ) : friends.map((f) => (
                  <div key={f._id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#1a1d23] transition-colors">
                    <div className="relative shrink-0">
                      <Avatar user={f} size={9} />
                      <OnlineDot online={onlineIds.has(f._id)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#e8eaed] truncate">{f.name}</p>
                      <p className="text-xs text-[#9b9e9e] truncate">@{f.username}</p>
                    </div>
                    <button onClick={() => unfriend(f._id)} className="text-[#9b9e9e]/40 hover:text-red-400 transition-colors p-1" title="Remove friend">
                      <UserMinus size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Requests */}
            {tab === 'requests' && (
              <div className="py-2">
                {requests.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <UserPlus size={32} className="mx-auto text-[#9b9e9e]/30 mb-3" />
                    <p className="text-sm text-[#9b9e9e]">No pending requests</p>
                  </div>
                ) : requests.map((r) => (
                  <div key={r.from._id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#1a1d23] transition-colors">
                    <Avatar user={r.from} size={9} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#e8eaed] truncate">{r.from.name}</p>
                      <p className="text-xs text-[#9b9e9e] truncate">@{r.from.username}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => acceptRequest(r.from._id)}
                        disabled={actionStates[r.from._id] === 'loading'}
                        className="w-7 h-7 rounded-lg bg-[#53fc18]/15 border border-[#53fc18]/30 text-[#53fc18] flex items-center justify-center hover:bg-[#53fc18]/25 transition-colors"
                      >
                        {actionStates[r.from._id] === 'loading' ? <Loader2 size={11} className="animate-spin" /> : <UserCheck size={11} />}
                      </button>
                      <button
                        onClick={() => declineRequest(r.from._id)}
                        className="w-7 h-7 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center hover:bg-red-500/25 transition-colors"
                      >
                        <UserX size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Search */}
            {tab === 'search' && (
              <div className="p-4 space-y-3">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9b9e9e]" />
                  <input
                    type="text"
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    placeholder="Search by name or username…"
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-[#0e0f13] border border-[#2a2d33] text-sm text-[#e8eaed] placeholder-[#9b9e9e]/50 focus:outline-none focus:border-[#53fc18] transition-colors"
                  />
                </div>
                {searching && <div className="flex justify-center py-4"><Loader2 size={16} className="text-[#9b9e9e] animate-spin" /></div>}
                {searchResults.map((u) => {
                  const state = actionStates[u._id]
                  const isFriend = friends.some(f => f._id === u._id)
                  return (
                    <div key={u._id} className="flex items-center gap-3 p-3 rounded-xl bg-[#0e0f13] border border-[#2a2d33]">
                      <Avatar user={u} size={9} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#e8eaed] truncate">{u.name}</p>
                        <p className="text-xs text-[#9b9e9e] truncate">@{u.username}</p>
                      </div>
                      {isFriend ? (
                        <span className="text-[10px] text-[#53fc18] font-semibold">Friends</span>
                      ) : (
                        <button
                          onClick={() => sendRequest(u._id)}
                          disabled={state === 'loading' || state === 'sent'}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                          style={{ background: state === 'sent' ? '#1a2e1a' : '#53fc1820', color: state === 'sent' ? '#53fc18' : '#53fc18', border: '1px solid #53fc1830' }}
                        >
                          {state === 'loading' ? <Loader2 size={10} className="animate-spin" /> : state === 'sent' ? <UserCheck size={10} /> : <Send size={10} />}
                          {state === 'sent' ? 'Sent' : 'Add'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  )
}
