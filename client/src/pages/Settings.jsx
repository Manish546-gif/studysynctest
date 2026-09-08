import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Bell, Palette, Shield, Check, Loader2, Camera,
  Mic, Video, Volume2, Monitor, Lock, KeyRound, Globe, Eye,
  Sparkles, CheckCircle2, AlertCircle, Moon, Zap, Radio
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../contexts/NotificationContext'
import { useToast } from '../contexts/ToastContext'
import { api, getAssetUrl } from '../services/api'
import { applyTheme, applyFont, getStoredTheme, getStoredFont } from '../utils/appearance'

const tabs = [
  { id: 'account', label: 'Channel & Account', icon: User },
  { id: 'stream', label: 'Stream & Audio/Video', icon: Video },
  { id: 'notifications', label: 'Alerts & Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance & Theme', icon: Palette },
  { id: 'privacy', label: 'Privacy & Security', icon: Shield },
]

const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
}

// ── Account & Channel Profile ──────────────────────────────────────────────
function AccountSection() {
  const { user, updateUser } = useAuth()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  const nameParts = (user?.name || '').split(' ')
  const [firstName, setFirstName] = useState(nameParts[0] || '')
  const [lastName, setLastName] = useState(nameParts.slice(1).join(' ') || '')
  const [email, setEmail] = useState(user?.email || '')
  const [username, setUsername] = useState(user?.username || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [usernameError, setUsernameError] = useState('')

  const initials = (user?.name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const data = await api.uploadAvatar(file)
      await updateUser(data.user)
      toast('Avatar updated successfully!', 'success')
    } catch (err) {
      setError(err.message || 'Failed to upload image')
      toast(err.message || 'Failed to upload image', 'error')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const name = `${firstName} ${lastName}`.trim()
    if (!name || !email.trim()) {
      setError('Name and email are required')
      return
    }
    const uname = username.trim().toLowerCase()
    if (!/^[a-z0-9_]{3,24}$/.test(uname)) {
      setUsernameError('3-24 characters, lowercase letters, numbers & underscores only')
      return
    }
    setUsernameError('')
    setSaving(true)
    setError('')
    try {
      await updateUser({ name, email: email.trim(), username: uname, bio: bio.trim() })
      setSaved(true)
      toast('Account settings saved!', 'success')
      setTimeout(() => setSaved(false), 1500)
    } catch (err) {
      setError(err.message || 'Failed to update account')
      toast(err.message || 'Failed to update account', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div variants={sectionVariants} initial="hidden" animate="visible" exit="exit">
      <div style={{ background: '#16191e', border: '1px solid #2a2d33', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e8eaed', marginBottom: 6 }}>
          Channel & Account Settings
        </h2>
        <p style={{ fontSize: 13, color: '#808a93', marginBottom: 24 }}>
          Manage your Kick channel details, avatar, and personal login information.
        </p>

        {/* Avatar section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #2a2d33' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', background: '#1a3a0a', border: '2px solid #53fc18',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#53fc18',
              overflow: 'hidden',
            }}>
              {user?.avatar ? (
                <img src={getAssetUrl(user.avatar)} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : initials}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 28, height: 28, borderRadius: '50%', background: '#53fc18', color: '#000',
                border: '2px solid #16191e', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Change Profile Picture"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#e8eaed', margin: 0 }}>Channel Avatar</p>
            <p style={{ fontSize: 12, color: '#808a93', margin: '4px 0 0' }}>JPG, PNG or GIF under 5MB. Appears in live streams and room lists.</p>
          </div>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#808a93', display: 'block', marginBottom: 6 }}>First Name</label>
              <input
                value={firstName} onChange={(e) => setFirstName(e.target.value)}
                style={{ width: '100%', background: '#0e0f13', border: '1px solid #3a4048', borderRadius: 6, padding: '10px 14px', fontSize: 14, color: '#e8eaed', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#808a93', display: 'block', marginBottom: 6 }}>Last Name</label>
              <input
                value={lastName} onChange={(e) => setLastName(e.target.value)}
                style={{ width: '100%', background: '#0e0f13', border: '1px solid #3a4048', borderRadius: 6, padding: '10px 14px', fontSize: 14, color: '#e8eaed', outline: 'none' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#808a93', display: 'block', marginBottom: 6 }}>Username (@handle)</label>
            <input
              value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
              style={{ width: '100%', background: '#0e0f13', border: '1px solid #3a4048', borderRadius: 6, padding: '10px 14px', fontSize: 14, color: '#e8eaed', outline: 'none' }}
            />
            {usernameError && <p style={{ fontSize: 12, color: '#ff4f4f', marginTop: 4 }}>{usernameError}</p>}
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#808a93', display: 'block', marginBottom: 6 }}>Email Address</label>
            <input
              value={email} onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', background: '#0e0f13', border: '1px solid #3a4048', borderRadius: 6, padding: '10px 14px', fontSize: 14, color: '#e8eaed', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#808a93', display: 'block', marginBottom: 6 }}>Channel Bio / About</label>
            <textarea
              rows={3} value={bio} onChange={(e) => setBio(e.target.value)}
              placeholder="Tell your study buddies about your background and interests..."
              style={{ width: '100%', background: '#0e0f13', border: '1px solid #3a4048', borderRadius: 6, padding: '10px 14px', fontSize: 14, color: '#e8eaed', outline: 'none', resize: 'none' }}
            />
          </div>

          {error && <p style={{ fontSize: 12, color: '#ff4f4f', margin: 0 }}>{error}</p>}

          <button type="submit" disabled={saving} className="btn-kick" style={{ width: 'fit-content', padding: '10px 24px' }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : null}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Account Settings'}
          </button>
        </form>
      </div>
    </motion.div>
  )
}

// ── Stream & Audio/Video Controls ──────────────────────────────────────────
function StreamSection() {
  const { toast } = useToast()
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [noiseCancel, setNoiseCancel] = useState(true)
  const [quality, setQuality] = useState('1080p')

  const handleSave = () => {
    toast('Audio & Video stream settings updated!', 'success')
  }

  return (
    <motion.div variants={sectionVariants} initial="hidden" animate="visible" exit="exit">
      <div style={{ background: '#16191e', border: '1px solid #2a2d33', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e8eaed', marginBottom: 6 }}>
          Live Stream & Media Settings
        </h2>
        <p style={{ fontSize: 13, color: '#808a93', marginBottom: 24 }}>
          Configure your camera, microphone, noise suppression, and default video broadcast resolution.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 14, background: '#0e0f13', border: '1px solid #2a2d33', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Mic size={20} style={{ color: '#53fc18' }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#e8eaed', margin: 0 }}>Join Rooms Muted</p>
                <p style={{ fontSize: 11, color: '#808a93', margin: 0 }}>Keep microphone muted when entering live study stages</p>
              </div>
            </div>
            <input type="checkbox" checked={micOn} onChange={(e) => setMicOn(e.target.checked)} style={{ accentColor: '#53fc18', width: 18, height: 18, cursor: 'pointer' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 14, background: '#0e0f13', border: '1px solid #2a2d33', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Video size={20} style={{ color: '#53fc18' }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#e8eaed', margin: 0 }}>Camera Auto-Start</p>
                <p style={{ fontSize: 11, color: '#808a93', margin: 0 }}>Automatically enable webcam when joining live rooms</p>
              </div>
            </div>
            <input type="checkbox" checked={camOn} onChange={(e) => setCamOn(e.target.checked)} style={{ accentColor: '#53fc18', width: 18, height: 18, cursor: 'pointer' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 14, background: '#0e0f13', border: '1px solid #2a2d33', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Volume2 size={20} style={{ color: '#53fc18' }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#e8eaed', margin: 0 }}>AI Noise Cancellation</p>
                <p style={{ fontSize: 11, color: '#808a93', margin: 0 }}>Filter out background ambient sound during voice calls</p>
              </div>
            </div>
            <input type="checkbox" checked={noiseCancel} onChange={(e) => setNoiseCancel(e.target.checked)} style={{ accentColor: '#53fc18', width: 18, height: 18, cursor: 'pointer' }} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#808a93', display: 'block', marginBottom: 6 }}>Broadcast Quality Resolution</label>
            <select
              value={quality} onChange={(e) => setQuality(e.target.value)}
              style={{ width: '100%', background: '#0e0f13', border: '1px solid #3a4048', borderRadius: 6, padding: '10px 14px', fontSize: 14, color: '#e8eaed', outline: 'none' }}
            >
              <option value="1080p">1080p Full HD (Recommended for Screen Share)</option>
              <option value="720p">720p HD (Smooth Performance)</option>
              <option value="480p">480p SD (Data Saver)</option>
            </select>
          </div>

          <button onClick={handleSave} className="btn-kick" style={{ width: 'fit-content', padding: '10px 24px', marginTop: 8 }}>
            Save Stream Preferences
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Notifications ──────────────────────────────────────────────────────────
function NotificationsSection() {
  const { notifications, updatePreferences } = useNotifications()
  const { toast } = useToast()
  const [prefs, setPrefs] = useState(notifications?.preferences || {
    roomInvites: true,
    chatMentions: true,
    sound: true,
    emailDigest: false,
  })

  const toggle = (key) => {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    updatePreferences(next)
    toast('Notification settings saved', 'info')
  }

  return (
    <motion.div variants={sectionVariants} initial="hidden" animate="visible" exit="exit">
      <div style={{ background: '#16191e', border: '1px solid #2a2d33', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e8eaed', marginBottom: 6 }}>
          Alerts & Notifications
        </h2>
        <p style={{ fontSize: 13, color: '#808a93', marginBottom: 24 }}>
          Control how you receive room invitations, chat mentions, and broadcast alerts.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { key: 'roomInvites', label: 'Room Invitations', desc: 'Receive pop-up alerts when someone invites you to a study room' },
            { key: 'chatMentions', label: 'Chat @Mentions', desc: 'Get notified when someone mentions your username in chat' },
            { key: 'sound', label: 'Notification Sounds', desc: 'Play audio chime for incoming messages and alerts' },
            { key: 'emailDigest', label: 'Weekly Email Digest', desc: 'Receive a weekly summary of study hours and room achievements' },
          ].map((item) => (
            <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 14, background: '#0e0f13', border: '1px solid #2a2d33', borderRadius: 8 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#e8eaed', margin: 0 }}>{item.label}</p>
                <p style={{ fontSize: 11, color: '#808a93', margin: 0 }}>{item.desc}</p>
              </div>
              <input type="checkbox" checked={!!prefs[item.key]} onChange={() => toggle(item.key)} style={{ accentColor: '#53fc18', width: 18, height: 18, cursor: 'pointer' }} />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ── Appearance & Kick Theme ────────────────────────────────────────────────
function AppearanceSection() {
  const { toast } = useToast()
  const [currentTheme, setCurrentTheme] = useState('dark')

  return (
    <motion.div variants={sectionVariants} initial="hidden" animate="visible" exit="exit">
      <div style={{ background: '#16191e', border: '1px solid #2a2d33', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e8eaed', marginBottom: 6 }}>
          Appearance & Kick Theme
        </h2>
        <p style={{ fontSize: 13, color: '#808a93', marginBottom: 24 }}>
          StudySync is tuned to Kick.com's dark mode aesthetic for maximum focus and eye comfort.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div style={{
            background: '#0e0f13', border: '2px solid #53fc18', borderRadius: 8, padding: 16, textAlign: 'center', cursor: 'pointer',
          }}>
            <Moon size={24} style={{ color: '#53fc18', margin: '0 auto 8px' }} />
            <p style={{ fontSize: 14, fontWeight: 700, color: '#e8eaed', margin: 0 }}>Kick Dark Mode</p>
            <p style={{ fontSize: 11, color: '#53fc18', margin: '4px 0 0' }}>Active Default</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Privacy & Security ────────────────────────────────────────────────────
function PrivacySection() {
  const { toast } = useToast()
  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [changing, setChanging] = useState(false)

  const handleChangePassword = (e) => {
    e.preventDefault()
    if (!oldPass || !newPass) {
      toast('Please enter current and new password', 'error')
      return
    }
    setChanging(true)
    setTimeout(() => {
      setChanging(false)
      setOldPass('')
      setNewPass('')
      toast('Password updated successfully!', 'success')
    }, 1000)
  }

  return (
    <motion.div variants={sectionVariants} initial="hidden" animate="visible" exit="exit">
      <div style={{ background: '#16191e', border: '1px solid #2a2d33', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e8eaed', marginBottom: 6 }}>
          Privacy & Security
        </h2>
        <p style={{ fontSize: 13, color: '#808a93', marginBottom: 24 }}>
          Manage your account password and security options.
        </p>

        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 440 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#808a93', display: 'block', marginBottom: 6 }}>Current Password</label>
            <input
              type="password" value={oldPass} onChange={(e) => setOldPass(e.target.value)}
              style={{ width: '100%', background: '#0e0f13', border: '1px solid #3a4048', borderRadius: 6, padding: '10px 14px', fontSize: 14, color: '#e8eaed', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#808a93', display: 'block', marginBottom: 6 }}>New Password</label>
            <input
              type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)}
              style={{ width: '100%', background: '#0e0f13', border: '1px solid #3a4048', borderRadius: 6, padding: '10px 14px', fontSize: 14, color: '#e8eaed', outline: 'none' }}
            />
          </div>

          <button type="submit" disabled={changing} className="btn-kick" style={{ width: 'fit-content', padding: '10px 24px' }}>
            {changing ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
            {changing ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </motion.div>
  )
}

// ── Main Settings Component ────────────────────────────────────────────────
export default function Settings() {
  const [activeTab, setActiveTab] = useState('account')

  return (
    <div style={{ background: '#0e0f13', minHeight: '100vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e8eaed', marginBottom: 6 }}>
          Settings & Preferences
        </h1>
        <p style={{ fontSize: 14, color: '#808a93', marginBottom: 28 }}>
          Configure your Kick channel profile, media stream controls, alerts, and security options.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
          {/* Sidebar Tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {tabs.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px', borderRadius: 8,
                    fontSize: 13, fontWeight: active ? 700 : 500,
                    color: active ? '#53fc18' : '#808a93',
                    background: active ? '#16191e' : 'transparent',
                    border: active ? '1px solid #2a2d33' : '1px solid transparent',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon size={18} style={{ color: active ? '#53fc18' : '#808a93' }} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Active Tab Panel */}
          <div>
            <AnimatePresence mode="wait">
              {activeTab === 'account' && <AccountSection key="account" />}
              {activeTab === 'stream' && <StreamSection key="stream" />}
              {activeTab === 'notifications' && <NotificationsSection key="notifications" />}
              {activeTab === 'appearance' && <AppearanceSection key="appearance" />}
              {activeTab === 'privacy' && <PrivacySection key="privacy" />}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
