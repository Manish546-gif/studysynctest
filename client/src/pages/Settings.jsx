import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Bell, Palette, Shield, Camera, Check, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { applyTheme, applyFont, getStoredTheme, getStoredFont } from '../utils/appearance'

const tabs = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'privacy', label: 'Privacy', icon: Shield },
]

const themes = [
  { id: 'light', label: 'Collaborative Light', previewBg: '#fff8f0' },
  { id: 'dark', label: 'Midnight Focus', previewBg: '#1a1a2e' },
  { id: 'retro', label: 'Retro Study', previewBg: '#f5e6d3' },
]

const fonts = [
  { id: 'inter', label: 'Inter', family: 'Inter, sans-serif', sample: 'The quick brown fox' },
  { id: 'playfair', label: 'Playfair Display', family: '"Playfair Display", serif', sample: 'The quick brown fox' },
  { id: 'jetbrains', label: 'JetBrains Mono', family: '"JetBrains Mono", monospace', sample: 'const hello = "world"' },
]

const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
}

function AccountSection() {
  const { user, updateUser } = useAuth()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const nameParts = (user?.name || '').split(' ')
  const [firstName, setFirstName] = useState(nameParts[0] || '')
  const [lastName, setLastName] = useState(nameParts.slice(1).join(' ') || '')
  const [email, setEmail] = useState(user?.email || '')
  const initials = (user?.name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleSave = async (e) => {
    e.preventDefault()
    const name = `${firstName} ${lastName}`.trim()
    if (!name || !email.trim()) {
      setError('Name and email are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      await updateUser({ name, email: email.trim() })
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (err) {
      setError(err.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div variants={sectionVariants} initial="hidden" animate="visible" exit="exit" className="space-y-8">
      {/* Profile card */}
      <div className="flex items-center gap-5 p-5 bg-surface-container-low rounded-2xl">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center text-xl font-bold font-display text-on-primary-container">
            {initials}
          </div>
          <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-surface border border-outline-variant/30 flex items-center justify-center text-on-surface/50 hover:text-on-surface transition-colors">
            <Camera size={12} />
          </button>
        </div>
        <div className="min-w-0">
          <p className="font-display text-lg font-bold text-on-surface truncate">{user?.name || 'Member'}</p>
          <p className="text-sm text-on-surface/50 truncate">{user?.email}</p>
        </div>
      </div>

      {/* Form fields */}
      <form onSubmit={handleSave} className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-medium text-on-surface/50 mb-1.5">First Name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-outline-variant/40 bg-surface-container-lowest text-sm text-on-surface outline-none focus:border-primary-container transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface/50 mb-1.5">Last Name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-outline-variant/40 bg-surface-container-lowest text-sm text-on-surface outline-none focus:border-primary-container transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-on-surface/50 mb-1.5">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-outline-variant/40 bg-surface-container-lowest text-sm text-on-surface outline-none focus:border-primary-container transition-colors"
          />
        </div>

        {error && <p className="text-xs text-error">{error}</p>}

        <motion.button
          type="submit"
          disabled={saving}
          whileTap={{ scale: 0.98 }}
          className="px-6 py-2.5 bg-primary-container text-on-primary-container rounded-xl text-sm font-semibold hover:shadow-sm transition-all disabled:opacity-60"
        >
          {saving ? (
            <span className="inline-flex items-center gap-1.5"><Loader2 size={14} className="animate-spin" /> Saving...</span>
          ) : saved ? (
            <span className="inline-flex items-center gap-1.5"><Check size={14} /> Saved!</span>
          ) : (
            'Save Changes'
          )}
        </motion.button>
      </form>
    </motion.div>
  )
}

function AppearanceSection() {
  const [selectedTheme, setSelectedTheme] = useState(getStoredTheme())
  const [selectedFont, setSelectedFont] = useState(getStoredFont())

  const handleTheme = (id) => {
    setSelectedTheme(id)
    applyTheme(id)
  }

  const handleFont = (id) => {
    setSelectedFont(id)
    applyFont(id)
  }

  return (
    <motion.div variants={sectionVariants} initial="hidden" animate="visible" exit="exit" className="space-y-8">
      {/* Theme */}
      <div>
        <h3 className="font-display text-sm font-bold text-on-surface mb-3">Theme</h3>
        <div className="grid grid-cols-3 gap-4">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTheme(t.id)}
              className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                selectedTheme === t.id
                  ? 'border-primary shadow-sm'
                  : 'border-outline-variant/30 hover:border-outline-variant/60'
              }`}
            >
              <div
                className="w-full h-16 rounded-xl mb-3 border border-outline-variant/20"
                style={{ backgroundColor: t.previewBg }}
              />
              <p className="text-xs font-medium text-on-surface">{t.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Font */}
      <div>
        <h3 className="font-display text-sm font-bold text-on-surface mb-3">Font</h3>
        <div className="space-y-2">
          {fonts.map((f) => (
            <label
              key={f.id}
              className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                selectedFont === f.id
                  ? 'border-primary bg-primary-container/10'
                  : 'border-outline-variant/30 hover:border-outline-variant/60'
              }`}
            >
              <input
                type="radio"
                name="font"
                checked={selectedFont === f.id}
                onChange={() => handleFont(f.id)}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                selectedFont === f.id ? 'border-primary' : 'border-outline-variant/50'
              }`}>
                {selectedFont === f.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-on-surface">{f.label}</p>
                <p className="text-xs text-on-surface/40 mt-0.5" style={{ fontFamily: f.family }}>
                  {f.sample}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function Placeholder({ title }) {
  return (
    <motion.div
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center mb-4">
        <Bell size={24} className="text-on-surface/20" />
      </div>
      <p className="font-display text-base font-bold text-on-surface/50 mb-1">{title}</p>
      <p className="text-sm text-on-surface/30">Coming soon</p>
    </motion.div>
  )
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('account')

  return (
    <motion.div
      className="p-6 md:p-12 max-w-4xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <h1 className="font-display text-3xl font-bold text-on-surface mb-2">Settings</h1>
      <p className="text-on-surface/50 text-sm mb-8">Manage your account and preferences.</p>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Tab nav */}
        <div className="md:w-48 shrink-0">
          <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    active
                      ? 'bg-primary-container text-on-primary-container font-semibold'
                      : 'text-on-surface/50 hover:bg-surface-container-low hover:text-on-surface'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {activeTab === 'account' && <AccountSection key="account" />}
            {activeTab === 'appearance' && <AppearanceSection key="appearance" />}
            {activeTab === 'notifications' && <Placeholder key="notifications" title="Notifications" />}
            {activeTab === 'privacy' && <Placeholder key="privacy" title="Privacy & Security" />}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
