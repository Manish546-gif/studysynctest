import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import gsap from 'gsap'
import {
  Users, Pencil, ArrowRight, Calendar, Clock, Plus, X,
  Loader2, Flame, Copy, Check, LogIn, KeyRound, Trash2,
  BarChart3, BookOpen, PenTool, Eye, Hash, Zap, Lock, Unlock, Globe, Shield
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { api } from '../services/api'
import { SkeletonRoomCard } from '../components/common/Skeleton'
import ConfirmationModal from '../components/common/ConfirmationModal'

// ── Flat solid colors for room thumbnails (no gradients) ───────────────────────
const ROOM_GRADS = [
  '#1a3a0a',
  '#0a1a3a',
  '#003a1a',
  '#2a1a00',
  '#2a001a',
  '#1a1a00',
]

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function sessionDayLabel(date) {
  const today = new Date(); today.setHours(0,0,0,0)
  const day = new Date(date); day.setHours(0,0,0,0)
  const diffDays = Math.round((today - day) / 86400000)
  if (diffDays === 0) return 'TODAY'
  if (diffDays === 1) return 'YESTERDAY'
  return day.toLocaleDateString([], { month: 'short' }).toUpperCase()
}

// ── Kick & Discord Modal wrapper ───────────────────────────────────────────
function KickModal({ onClose, children }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50 }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16 }}
      >
        <div
          style={{
            background: '#16191e',
            border: '1px solid #2a2d33',
            borderRadius: 12,
            width: '100%', maxWidth: 460,
            padding: 24,
            boxShadow: '0 24px 80px rgba(0,0,0,0.85)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </motion.div>
    </>
  )
}

const kickInputStyle = {
  width: '100%',
  background: '#0e0f13',
  border: '1px solid #3a4048',
  borderRadius: 6,
  padding: '10px 14px',
  fontSize: 14,
  color: '#e8eaed',
  outline: 'none',
  transition: 'border-color 0.15s ease',
  fontFamily: 'Inter, sans-serif',
}

export default function Dashboard() {
  const statsRef = useRef(null)
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)

  // Modals & form state
  const [modal, setModal] = useState(null) // 'create' | 'join' | 'created' | 'privateLock'
  const [selectedPrivateRoom, setSelectedPrivateRoom] = useState(null)
  const [privatePasscode, setPrivatePasscode] = useState('')
  const [privateError, setPrivateError] = useState('')

  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomDesc, setNewRoomDesc] = useState('')
  const [newRoomIsPublic, setNewRoomIsPublic] = useState(true)
  const [newRoomPasscode, setNewRoomPasscode] = useState('')
  const [creatingRoom, setCreatingRoom] = useState(false)
  const [createError, setCreateError] = useState('')

  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  const [createdRoom, setCreatedRoom] = useState(null)
  const [codeCopied, setCodeCopied] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [deletingRoom, setDeletingRoom] = useState(false)

  useEffect(() => {
    api.getRooms()
      .then((data) => setRooms(data.rooms || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const displayName = user?.username || user?.name?.split(' ')[0] || 'there'
  const createdRooms = rooms.filter((r) => r.host?._id === user?.id)
  const recentRooms = [...rooms]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5)

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCreateRoom = async (e) => {
    e.preventDefault()
    if (!newRoomName.trim()) return
    setCreatingRoom(true); setCreateError('')
    try {
      const data = await api.createRoom({
        name: newRoomName.trim(),
        description: newRoomDesc.trim(),
        isPublic: newRoomIsPublic,
        code: newRoomPasscode.trim(),
      })
      setRooms((prev) => [data.room, ...prev])
      setNewRoomName(''); setNewRoomDesc(''); setNewRoomIsPublic(true); setNewRoomPasscode('')
      setCreatedRoom(data.room); setModal('created')
      toast(`Room "${data.room.name}" created!`, 'success')
    } catch (err) {
      setCreateError(err.message || 'Failed to create room')
      toast(err.message || 'Failed to create room', 'error')
    } finally { setCreatingRoom(false) }
  }

  const handleJoinByLink = (e) => {
    e.preventDefault()
    if (!joinCode.trim()) return
    setJoining(true); setJoinError('')
    const clean = joinCode.trim()
    const base = `${window.location.origin}/workspace/`
    let id = clean
    if (clean.startsWith(base)) id = clean.slice(base.length).split('?')[0]
    else if (clean.startsWith('/workspace/')) id = clean.split('/workspace/')[1].split('?')[0]
    id = id.trim()
    setJoining(false)
    if (!id) { setJoinError('Paste a valid invite link or room ID'); toast('Invalid room link', 'error'); return }
    navigate(`/workspace/${id}`)
  }

  const handleJoinRoom = (room) => {
    const isHost = room.host?._id === user?.id
    const isMember = room.members?.some((m) => m._id === user?.id || m === user?.id)
    
    // Discord Private Room Logic: if room is private & user is not host/member, require passcode/key
    if (!room.isPublic && !isHost && !isMember) {
      setSelectedPrivateRoom(room)
      setPrivatePasscode('')
      setPrivateError('')
      setModal('privateLock')
      return
    }

    navigate(`/workspace/${room._id}`)
  }

  const handleVerifyPrivatePasscode = (e) => {
    e.preventDefault()
    if (!selectedPrivateRoom) return
    const expected = selectedPrivateRoom.code || ''
    if (expected && privatePasscode.trim().toUpperCase() !== expected.toUpperCase()) {
      setPrivateError('Incorrect Room Passcode / Key')
      toast('Incorrect Room Passcode', 'error')
      return
    }
    setModal(null)
    toast('Access granted to Private Server!', 'success')
    navigate(`/workspace/${selectedPrivateRoom._id}`)
  }

  const handleDeleteRoom = async () => {
    if (!deleteTargetId) return
    setDeletingRoom(true)
    try {
      await api.deleteRoom(deleteTargetId)
      setRooms((prev) => prev.filter((r) => r._id !== deleteTargetId))
      setDeleteTargetId(null)
      toast('Room deleted', 'info')
    } catch (err) {
      toast(err.message || 'Failed to delete room', 'error')
    } finally { setDeletingRoom(false) }
  }

  const copyInviteLink = () => {
    if (createdRoom?._id) {
      navigator.clipboard.writeText(`${window.location.origin}/workspace/${createdRoom._id}?invite=true`)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    }
  }

  return (
    <div style={{ background: '#0e0f13', minHeight: '100vh', padding: '24px' }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e8eaed', lineHeight: 1.2 }}>
            Discord & Kick Study Channels
          </h1>
          <p style={{ fontSize: 13, color: '#808a93', marginTop: 4 }}>
            Welcome back, <span style={{ color: '#53fc18' }}>{displayName}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn-kick-outline"
            onClick={() => { setModal('join'); setJoinCode(''); setJoinError('') }}
          >
            <LogIn size={15} /> Join with Code
          </button>
          <button
            className="btn-kick"
            onClick={() => { setModal('create'); setCreatedRoom(null); setCreateError('') }}
          >
            <Plus size={15} /> Create Channel
          </button>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div ref={statsRef} style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Study Rooms', value: rooms.length, icon: Users, color: '#53fc18', bg: '#1a3a0a' },
          { label: 'Rooms Created', value: createdRooms.length, icon: Zap, color: '#3d8bff', bg: '#0a1a3a' },
          { label: 'Recent Sessions', value: recentRooms.length, icon: Clock, color: '#ff6b6b', bg: '#2a0a0a' },
        ].map((stat) => (
          <div key={stat.label} style={{
            flex: 1,
            background: '#16191e',
            border: '1px solid #2a2d33',
            borderRadius: 8,
            padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 8,
              background: stat.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: stat.color, flexShrink: 0,
            }}>
              <stat.icon size={20} />
            </div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#e8eaed', lineHeight: 1 }}>{stat.value}</p>
              <p style={{ fontSize: 12, color: '#808a93', marginTop: 4 }}>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main content grid: Room cards & Recent Activity ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        
        {/* Rooms Grid */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e8eaed', marginBottom: 16 }}>
            My Active Rooms & Channels
          </h2>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
              <SkeletonRoomCard /><SkeletonRoomCard /><SkeletonRoomCard />
            </div>
          ) : rooms.length === 0 ? (
            <div style={{ background: '#16191e', border: '1px solid #2a2d33', borderRadius: 12, padding: 40, textAlign: 'center' }}>
              <Users size={32} style={{ color: '#808a93', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 14, color: '#e8eaed', fontWeight: 600 }}>No study channels created</p>
              <p style={{ fontSize: 12, color: '#808a93', marginTop: 4 }}>Create a Public or Private room to start streaming!</p>
              <button onClick={() => setModal('create')} className="btn-kick" style={{ margin: '16px auto 0' }}>
                + Create First Channel
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
              {rooms.map((room, idx) => {
                const isHost = room.host?._id === user?.id
                const isPublic = room.isPublic !== false
                const accent = room.theme?.accentColor || '#53fc18'

                return (
                  <div
                    key={room._id}
                    className="kick-card group transition-all duration-200 hover:-translate-y-0.5"
                    style={{
                      background: '#16191e',
                      border: `1px solid ${room.theme?.accentColor ? `${accent}44` : '#2a2d33'}`,
                      borderRadius: 10,
                      overflow: 'hidden',
                      display: 'flex', flexDirection: 'column',
                    }}
                  >
                    {/* Card Thumbnail Header */}
                    <div style={{
                      height: 80,
                      background: room.theme?.accentColor
                        ? `linear-gradient(135deg, ${accent}40 0%, #16191e 100%)`
                        : ROOM_GRADS[idx % ROOM_GRADS.length],
                      borderTop: `3px solid ${accent}`,
                      padding: 12,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                      position: 'relative',
                    }}>
                      {/* Discord Public/Private Badge */}
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        background: isPublic ? 'rgba(83, 252, 24, 0.2)' : 'rgba(255, 107, 107, 0.2)',
                        color: isPublic ? '#53fc18' : '#ff6b6b',
                        border: `1px solid ${isPublic ? '#53fc18' : '#ff6b6b'}`,
                        padding: '2px 8px', borderRadius: 4,
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        {isPublic ? <Globe size={11} /> : <Lock size={11} />}
                        {isPublic ? 'PUBLIC' : 'PRIVATE'}
                      </span>

                      {/* Delete button for Host */}
                      {isHost && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTargetId(room._id) }}
                          style={{ background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 4, color: '#ff4f4f', cursor: 'pointer', padding: 4 }}
                          title="Delete Channel"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    {/* Card Details */}
                    <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e8eaed', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {room.name}
                        </h3>
                        <p style={{ fontSize: 12, color: '#808a93', marginBottom: 12, lineHeight: 1.3, height: 32, overflow: 'hidden' }}>
                          {room.description || 'Live study channel & video stage.'}
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #2a2d33' }}>
                        <span style={{ fontSize: 11, color: '#808a93', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Users size={12} /> {room.members?.length || 1} members
                        </span>
                        <button
                          onClick={() => handleJoinRoom(room)}
                          className={isPublic ? 'btn-kick' : 'btn-kick-outline'}
                          style={{ fontSize: 12, padding: '5px 12px' }}
                        >
                          {isPublic ? 'Join' : 'Unlock'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Session Log */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e8eaed', marginBottom: 16 }}>
            Recent Activity
          </h2>
          <div style={{ background: '#16191e', border: '1px solid #2a2d33', borderRadius: 10, overflow: 'hidden' }}>
            {recentRooms.length === 0 ? (
              <p style={{ padding: 20, fontSize: 12, color: '#808a93', textAlign: 'center' }}>No recent activities</p>
            ) : (
              recentRooms.map((r) => (
                <div
                  key={r._id}
                  onClick={() => handleJoinRoom(r)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', borderBottom: '1px solid #2a2d33', cursor: 'pointer',
                  }}
                  className="hover:bg-[#1e2228]"
                >
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#e8eaed' }}>{r.name}</p>
                    <p style={{ fontSize: 11, color: '#808a93' }}>{timeAgo(r.updatedAt)}</p>
                  </div>
                  <ArrowRight size={14} color="#808a93" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {/* Create Room Modal */}
        {modal === 'create' && (
          <KickModal onClose={() => setModal(null)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e8eaed' }}>Create Discord-Style Channel</h2>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#808a93' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#808a93', marginBottom: 6 }}>Channel Name</label>
                <input autoFocus value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="e.g., Computer Science Lounge" style={kickInputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#808a93', marginBottom: 6 }}>Channel Description</label>
                <textarea value={newRoomDesc} onChange={(e) => setNewRoomDesc(e.target.value)}
                  placeholder="What will you study in this channel?" rows={2} style={{ ...kickInputStyle, resize: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#808a93', marginBottom: 6 }}>Channel Privacy Type</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={() => setNewRoomIsPublic(true)}
                    style={{
                      flex: 1, padding: 10, borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                      background: newRoomIsPublic ? '#1a3a0a' : '#0e0f13',
                      border: `1px solid ${newRoomIsPublic ? '#53fc18' : '#3a4048'}`,
                      color: newRoomIsPublic ? '#53fc18' : '#808a93',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                    <Globe size={14} /> Public Server
                  </button>
                  <button type="button" onClick={() => setNewRoomIsPublic(false)}
                    style={{
                      flex: 1, padding: 10, borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                      background: !newRoomIsPublic ? '#3a0a0a' : '#0e0f13',
                      border: `1px solid ${!newRoomIsPublic ? '#ff6b6b' : '#3a4048'}`,
                      color: !newRoomIsPublic ? '#ff6b6b' : '#808a93',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                    <Lock size={14} /> Private Locked
                  </button>
                </div>
              </div>

              {!newRoomIsPublic && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#808a93', marginBottom: 6 }}>Set Private Passcode / Key (optional)</label>
                  <input value={newRoomPasscode} onChange={(e) => setNewRoomPasscode(e.target.value)}
                    placeholder="e.g. SECRET123" style={kickInputStyle} />
                </div>
              )}

              {createError && <p style={{ fontSize: 12, color: '#ff4f4f' }}>{createError}</p>}
              <button type="submit" disabled={creatingRoom || !newRoomName.trim()} className="btn-kick" style={{ width: '100%', padding: 12, marginTop: 4 }}>
                {creatingRoom ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {creatingRoom ? 'Creating Channel...' : 'Create Channel'}
              </button>
            </form>
          </KickModal>
        )}

        {/* Private Room Passcode Verification Modal */}
        {modal === 'privateLock' && selectedPrivateRoom && (
          <KickModal onClose={() => setModal(null)}>
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: '#3a0a0a', border: '2px solid #ff6b6b',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
              }}>
                <Lock size={24} color="#ff6b6b" />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e8eaed', marginBottom: 6 }}>
                Private Server Locked
              </h2>
              <p style={{ fontSize: 13, color: '#808a93', marginBottom: 20 }}>
                "{selectedPrivateRoom.name}" requires a passcode or invite authorization to join.
              </p>

              <form onSubmit={handleVerifyPrivatePasscode} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input
                  autoFocus
                  type="password"
                  value={privatePasscode}
                  onChange={(e) => { setPrivatePasscode(e.target.value); setPrivateError('') }}
                  placeholder="Enter Room Passcode / Key"
                  style={{ ...kickInputStyle, textAlign: 'center', letterSpacing: '0.1em' }}
                />
                {privateError && <p style={{ fontSize: 12, color: '#ff4f4f' }}>{privateError}</p>}

                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                  <button type="submit" className="btn-kick" style={{ flex: 1, padding: 10 }}>
                    Unlock & Join
                  </button>
                  <button type="button" onClick={() => setModal(null)} className="btn-kick-outline" style={{ padding: 10 }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </KickModal>
        )}

        {/* Created Room Modal */}
        {modal === 'created' && createdRoom && (
          <KickModal onClose={() => setModal(null)}>
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, background: '#1a3a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Check size={28} color="#53fc18" />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e8eaed', marginBottom: 6 }}>Channel Created!</h2>
              <p style={{ fontSize: 13, color: '#808a93', marginBottom: 20 }}>Share invite link to bring friends</p>
              <div style={{ background: '#0e0f13', border: '1px solid #2a2d33', borderRadius: 8, padding: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#e8eaed', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {window.location.origin}/workspace/{createdRoom._id}
                </span>
                <button onClick={copyInviteLink} style={{ background: '#1e2228', border: '1px solid #3a4048', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', color: '#53fc18' }}>
                  {codeCopied ? <Check size={15} /> : <Copy size={15} />}
                </button>
              </div>
              <button className="btn-kick" onClick={() => { setModal(null); navigate(`/workspace/${createdRoom._id}`) }} style={{ width: '100%', padding: 12 }}>
                Enter Channel Stage
              </button>
            </div>
          </KickModal>
        )}

        {/* Join Room Modal */}
        {modal === 'join' && (
          <KickModal onClose={() => setModal(null)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e8eaed' }}>Join Channel with Code / Link</h2>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#808a93' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleJoinByLink} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input autoFocus value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Paste invite URL or Room ID" style={kickInputStyle} />
              {joinError && <p style={{ fontSize: 12, color: '#ff4f4f' }}>{joinError}</p>}
              <button type="submit" className="btn-kick" style={{ width: '100%', padding: 12 }}>
                Join Channel
              </button>
            </form>
          </KickModal>
        )}
      </AnimatePresence>

      <ConfirmationModal
        open={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteRoom}
        title="Delete Channel"
        message="Are you sure you want to delete this channel?"
        confirmText="Delete"
        confirmVariant="danger"
        loading={deletingRoom}
      />
    </div>
  )
}
