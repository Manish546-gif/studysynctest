import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Clock, Users, Edit3, ChevronRight, Loader2, Settings, Camera,
  UserRound, AtSign, Check, Flame, Trophy, Zap, ShieldCheck,
  Share2, Globe, Code, MessageCircle, MessageSquare, PenTool, Radio,
  Calendar, Award, Sparkles, BookOpen, Layers, ExternalLink
} from 'lucide-react'
import gsap from 'gsap'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { api, getAssetUrl } from '../services/api'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}

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

// Channel Banners - flat dark solid colors (no gradients)
const BANNERS = [
  '#1a3a0a',
  '#0a1a3a',
  '#0f1f3a',
  '#2a1a3a',
]

export default function Profile() {
  const statsRef = useRef(null)
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()
  const { toast } = useToast()
  
  const [rooms, setRooms] = useState([])
  const [whiteboards, setWhiteboards] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview') // overview | rooms | whiteboards | stats

  // Form states
  const [username, setUsername] = useState(user?.username || '')
  const [name, setName] = useState(user?.name || '')
  const [bio, setBio] = useState(user?.bio || 'Passionate student & streamer building collaborative study spaces.')
  const [githubUrl, setGithubUrl] = useState(user?.githubUrl || '')
  const [discordTag, setDiscordTag] = useState(user?.discordTag || '')
  
  const [usernameError, setUsernameError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const fileInputRef = useRef(null)

  const initials = (name || user?.name || 'User')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  useEffect(() => {
    if (user?.username) setUsername(user.username)
    if (user?.name) setName(user.name)
    if (user?.bio) setBio(user.bio)
  }, [user])

  useEffect(() => {
    Promise.all([
      api.getRooms().catch(() => ({ rooms: [] })),
      api.getWhiteboards().catch(() => ({ whiteboards: [] })),
    ]).then(([roomData, wbData]) => {
      setRooms(roomData.rooms || [])
      setWhiteboards(wbData.whiteboards || [])
    }).finally(() => setLoading(false))
  }, [])

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const data = await api.uploadAvatar(file)
      await updateUser(data.user)
      toast('Avatar updated successfully!', 'success')
    } catch (err) {
      toast(err.message || 'Failed to upload avatar', 'error')
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSaveProfile = async () => {
    const cleanUser = username.trim().toLowerCase()
    if (!/^[a-z0-9_]{3,24}$/.test(cleanUser)) {
      setUsernameError('Username must be 3-24 characters (lowercase letters, numbers, underscores)')
      return
    }
    setUsernameError('')
    setSavingProfile(true)
    try {
      await updateUser({
        username: cleanUser,
        name: name.trim(),
        bio: bio.trim(),
        githubUrl: githubUrl.trim(),
        discordTag: discordTag.trim(),
      })
      setProfileSaved(true)
      toast('Profile updated successfully!', 'success')
      setTimeout(() => setProfileSaved(false), 2000)
    } catch (err) {
      setUsernameError(err.message || 'Could not update profile')
      toast(err.message || 'Could not update profile', 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  const copyChannelLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopiedLink(true)
    toast('Channel link copied to clipboard!', 'info')
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const createdRooms = rooms.filter((r) => r.host?._id === user?.id)
  const joinedRooms = rooms.filter((r) => r.host?._id !== user?.id)
  const hasAvatar = user?.avatar && user.avatar.trim().length > 0

  const activities = [...rooms]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 6)
    .map((r) => {
      const isHost = r.host?._id === user?.id
      return {
        icon: isHost ? Radio : Users,
        text: `${isHost ? 'Hosted stream' : 'Joined channel'} "${r.name}"`,
        time: timeAgo(r.updatedAt),
        roomId: r._id,
      }
    })

  // GSAP Counter Animation
  useEffect(() => {
    if (!statsRef.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.stat-count',
        { textContent: 0 },
        {
          textContent: (i, el) => el.dataset.target,
          duration: 1.2,
          ease: 'power2.out',
          snap: { textContent: 1 },
          stagger: 0.1,
        }
      )
    }, statsRef)
    return () => ctx.revert()
  }, [activeTab, rooms.length])

  return (
    <div style={{ background: '#0e0f13', minHeight: '100vh' }}>
      {/* ── Kick Channel Banner ────────────────────────────────────────── */}
      <div
        style={{
          height: 180,
          background: BANNERS[0],
          position: 'relative',
          borderBottom: '1px solid #2a2d33',
        }}
      >
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(83,252,24,0.08) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />
        <div style={{
          position: 'absolute', bottom: 16, right: 24,
          display: 'flex', gap: 10,
        }}>
          <button
            onClick={copyChannelLink}
            className="btn-kick-outline"
            style={{ fontSize: 12, padding: '6px 12px' }}
          >
            {copiedLink ? <Check size={14} /> : <Share2 size={14} />}
            {copiedLink ? 'Link Copied' : 'Share Channel'}
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="btn-kick-outline"
            style={{ fontSize: 12, padding: '6px 12px' }}
          >
            <Settings size={14} /> Settings
          </button>
        </div>
      </div>

      {/* ── Channel Profile Header Card ───────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 32px' }}>
        <div style={{
          position: 'relative', marginTop: -50, marginBottom: 24,
          display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 20,
        }}>
          {/* Avatar with Volt Green Ring */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              style={{
                width: 104, height: 104, borderRadius: '50%',
                background: '#16191e',
                border: '3px solid #53fc18',
                padding: 3,
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                display: 'block',
              }}
              title="Click to update channel avatar"
            >
              {uploadingAvatar ? (
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#1e2228', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Loader2 size={24} className="animate-spin text-[#53fc18]" />
                </div>
              ) : hasAvatar ? (
                <img
                  src={getAssetUrl(user.avatar)}
                  alt={user.name}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%', borderRadius: '50%',
                  background: '#1a3a0a', color: '#53fc18',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 32, fontWeight: 800,
                }}>
                  {initials}
                </div>
              )}
              <div className="hover-avatar-overlay" style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0, transition: 'opacity 0.2s',
              }}>
                <Camera size={22} color="#fff" />
              </div>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
          </div>

          {/* User & Channel Header Info */}
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e8eaed', margin: 0 }}>
                {name || user?.name || 'Student Creator'}
              </h1>
              <span title="Verified Kick Creator" style={{
                background: '#53fc18', color: '#0e0f13',
                borderRadius: '50%', width: 18, height: 18,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Check size={12} strokeWidth={3} />
              </span>
            </div>

            <p style={{ fontSize: 14, color: '#53fc18', fontWeight: 600, margin: '2px 0 6px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <AtSign size={14} /> {username || user?.username || 'username'}
            </p>

            <p style={{ fontSize: 13, color: '#b0b8c1', maxWidth: 600, lineHeight: 1.4 }}>
              {bio}
            </p>
          </div>

          {/* Quick Action Badges */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{
              background: '#16191e', border: '1px solid #2a2d33',
              borderRadius: 8, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Flame size={20} style={{ color: '#ff6b6b' }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#e8eaed', margin: 0 }}>7 Days</p>
                <p style={{ fontSize: 10, color: '#808a93', margin: 0 }}>Study Streak</p>
              </div>
            </div>

            <div style={{
              background: '#16191e', border: '1px solid #2a2d33',
              borderRadius: 8, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Trophy size={20} style={{ color: '#ffb800' }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#e8eaed', margin: 0 }}>{createdRooms.length} Rooms</p>
                <p style={{ fontSize: 10, color: '#808a93', margin: 0 }}>Hosted</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Kick Profile Channel Navigation Tabs ───────────────────── */}
        <div style={{
          borderBottom: '1px solid #2a2d33',
          display: 'flex', gap: 8, marginBottom: 24,
        }}>
          {[
            { id: 'overview', label: 'Overview & Badges', icon: Sparkles },
            { id: 'rooms', label: `My Rooms (${rooms.length})`, icon: Radio },
            { id: 'whiteboards', label: `Whiteboards (${whiteboards.length})`, icon: PenTool },
            { id: 'edit', label: 'Edit Profile & Handles', icon: UserRound },
          ].map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '12px 16px',
                  fontSize: 14, fontWeight: active ? 700 : 500,
                  color: active ? '#53fc18' : '#808a93',
                  borderBottom: active ? '2px solid #53fc18' : '2px solid transparent',
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={16} /> {tab.label}
              </button>
            )
          })}
        </div>

        {/* ── TAB 1: OVERVIEW & BADGES ───────────────────────────────── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {/* Achievements & Badges */}
            <div style={{ background: '#16191e', border: '1px solid #2a2d33', borderRadius: 12, padding: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e8eaed', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Award size={18} style={{ color: '#53fc18' }} /> Creator Badges & Rank
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: '#0e0f13', border: '1px solid #2a2d33', borderRadius: 8, padding: 12 }}>
                  <ShieldCheck size={20} style={{ color: '#53fc18', marginBottom: 6 }} />
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#e8eaed', margin: 0 }}>Verified Host</p>
                  <p style={{ fontSize: 11, color: '#808a93', margin: '2px 0 0' }}>Official StudySync Channel</p>
                </div>
                <div style={{ background: '#0e0f13', border: '1px solid #2a2d33', borderRadius: 8, padding: 12 }}>
                  <Zap size={20} style={{ color: '#3d8bff', marginBottom: 6 }} />
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#e8eaed', margin: 0 }}>Active Streamer</p>
                  <p style={{ fontSize: 11, color: '#808a93', margin: '2px 0 0' }}>{createdRooms.length}+ Rooms Created</p>
                </div>
                <div style={{ background: '#0e0f13', border: '1px solid #2a2d33', borderRadius: 8, padding: 12 }}>
                  <Flame size={20} style={{ color: '#ff6b6b', marginBottom: 6 }} />
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#e8eaed', margin: 0 }}>Daily Streak</p>
                  <p style={{ fontSize: 11, color: '#808a93', margin: '2px 0 0' }}>7 Consecutive Days</p>
                </div>
                <div style={{ background: '#0e0f13', border: '1px solid #2a2d33', borderRadius: 8, padding: 12 }}>
                  <BookOpen size={20} style={{ color: '#a855f7', marginBottom: 6 }} />
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#e8eaed', margin: 0 }}>Collaborator</p>
                  <p style={{ fontSize: 11, color: '#808a93', margin: '2px 0 0' }}>{rooms.length} Channels Joined</p>
                </div>
              </div>
            </div>

            {/* Social Handles & Bio */}
            <div style={{ background: '#16191e', border: '1px solid #2a2d33', borderRadius: 12, padding: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e8eaed', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Globe size={18} style={{ color: '#53fc18' }} /> Social Connections
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#0e0f13', padding: '10px 14px', borderRadius: 8, border: '1px solid #2a2d33' }}>
                  <Code size={18} style={{ color: '#808a93' }} />
                  <span style={{ fontSize: 13, color: '#e8eaed', flex: 1 }}>{githubUrl || 'github.com/username'}</span>
                  <span style={{ fontSize: 11, color: '#53fc18', background: '#1a3a0a', padding: '2px 8px', borderRadius: 4 }}>Linked</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#0e0f13', padding: '10px 14px', borderRadius: 8, border: '1px solid #2a2d33' }}>
                  <MessageSquare size={18} style={{ color: '#808a93' }} />
                  <span style={{ fontSize: 13, color: '#e8eaed', flex: 1 }}>{discordTag || 'Discord Tag'}</span>
                  <span style={{ fontSize: 11, color: '#53fc18', background: '#1a3a0a', padding: '2px 8px', borderRadius: 4 }}>Connected</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: MY ROOMS ────────────────────────────────────────── */}
        {activeTab === 'rooms' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e8eaed', margin: 0 }}>
                My Hosted & Joined Rooms
              </h2>
              <button onClick={() => navigate('/dashboard')} className="btn-kick">
                + Create New Room
              </button>
            </div>
            {rooms.length === 0 ? (
              <div style={{ background: '#16191e', border: '1px solid #2a2d33', borderRadius: 12, padding: 40, textAlign: 'center' }}>
                <Radio size={32} style={{ color: '#808a93', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, color: '#e8eaed', fontWeight: 600 }}>No rooms created yet</p>
                <p style={{ fontSize: 12, color: '#808a93', marginTop: 4 }}>Create your first live study room to start streaming with peers!</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {rooms.map((room) => (
                  <div key={room._id} className="kick-card" style={{ padding: 16, borderRadius: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, background: '#1a3a0a', color: '#53fc18', padding: '2px 8px', borderRadius: 4 }}>
                        {(room.tags || room.subjects || ['Study'])[0]}
                      </span>
                      <span style={{ fontSize: 11, color: '#53fc18', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#53fc18' }} /> LIVE
                      </span>
                    </div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e8eaed', marginBottom: 4 }}>{room.name}</h3>
                    <p style={{ fontSize: 12, color: '#808a93', marginBottom: 14, lineHeight: 1.3 }}>{room.description || 'Interactive live study channel.'}</p>
                    <button onClick={() => navigate(`/workspace/${room._id}`)} className="btn-kick" style={{ width: '100%', fontSize: 12, padding: '8px 0' }}>
                      Enter Room Stage
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: WHITEBOARDS ─────────────────────────────────────── */}
        {activeTab === 'whiteboards' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e8eaed', margin: 0 }}>
                My Canvas & Whiteboards
              </h2>
              <button onClick={() => navigate('/whiteboards')} className="btn-kick">
                + New Whiteboard
              </button>
            </div>
            {whiteboards.length === 0 ? (
              <div style={{ background: '#16191e', border: '1px solid #2a2d33', borderRadius: 12, padding: 40, textAlign: 'center' }}>
                <PenTool size={32} style={{ color: '#808a93', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, color: '#e8eaed', fontWeight: 600 }}>No whiteboards created yet</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                {whiteboards.map((wb) => (
                  <div key={wb._id} className="kick-card" style={{ padding: 16, borderRadius: 10 }}>
                    <PenTool size={20} style={{ color: '#53fc18', marginBottom: 10 }} />
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e8eaed', marginBottom: 4 }}>{wb.title || 'Untitled Board'}</h3>
                    <p style={{ fontSize: 11, color: '#808a93', marginBottom: 12 }}>Updated {timeAgo(wb.updatedAt)}</p>
                    <button onClick={() => navigate(`/whiteboards/${wb._id}`)} className="btn-kick-outline" style={{ width: '100%', fontSize: 12 }}>
                      Open Board
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: EDIT PROFILE ────────────────────────────────────── */}
        {activeTab === 'edit' && (
          <div style={{ background: '#16191e', border: '1px solid #2a2d33', borderRadius: 12, padding: 24, maxWidth: 640 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e8eaed', marginBottom: 20 }}>
              Edit Channel Info & Handles
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#808a93', display: 'block', marginBottom: 6 }}>Display Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%', background: '#0e0f13', border: '1px solid #3a4048',
                    borderRadius: 6, padding: '10px 14px', fontSize: 14, color: '#e8eaed', outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#808a93', display: 'block', marginBottom: 6 }}>Username (@handle)</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  style={{
                    width: '100%', background: '#0e0f13', border: '1px solid #3a4048',
                    borderRadius: 6, padding: '10px 14px', fontSize: 14, color: '#e8eaed', outline: 'none',
                  }}
                />
                {usernameError && <p style={{ fontSize: 12, color: '#ff4f4f', marginTop: 4 }}>{usernameError}</p>}
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#808a93', display: 'block', marginBottom: 6 }}>Channel Bio</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  style={{
                    width: '100%', background: '#0e0f13', border: '1px solid #3a4048',
                    borderRadius: 6, padding: '10px 14px', fontSize: 14, color: '#e8eaed', outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#808a93', display: 'block', marginBottom: 6 }}>GitHub Profile URL</label>
                <input
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/username"
                  style={{
                    width: '100%', background: '#0e0f13', border: '1px solid #3a4048',
                    borderRadius: 6, padding: '10px 14px', fontSize: 14, color: '#e8eaed', outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#808a93', display: 'block', marginBottom: 6 }}>Discord Tag</label>
                <input
                  value={discordTag}
                  onChange={(e) => setDiscordTag(e.target.value)}
                  placeholder="user#1234 or @username"
                  style={{
                    width: '100%', background: '#0e0f13', border: '1px solid #3a4048',
                    borderRadius: 6, padding: '10px 14px', fontSize: 14, color: '#e8eaed', outline: 'none',
                  }}
                />
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="btn-kick"
                style={{ width: '100%', padding: '12px 0', marginTop: 8 }}
              >
                {savingProfile ? <Loader2 size={16} className="animate-spin" /> : profileSaved ? <Check size={16} /> : null}
                {savingProfile ? 'Saving Changes...' : profileSaved ? 'Saved!' : 'Save Channel Profile'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
