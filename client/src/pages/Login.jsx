import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Loader2, Zap, Users, PenTool, MessageCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const inputStyle = {
  width: '100%',
  background: '#0e0f13',
  border: '1px solid #3a4048',
  borderRadius: 6,
  padding: '12px 14px',
  fontSize: 14,
  color: '#e8eaed',
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
  transition: 'border-color 0.15s ease',
}

export default function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [showPw, setShowPw] = useState(false)
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  // Full-page redirect OAuth
  const startGoogleLogin = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) { setError('Google sign-in is not configured'); return }
    const state = (crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`)
    sessionStorage.setItem('google_oauth_state', state)
    const redirectUri = `${window.location.origin}/google-callback`
    const url =
      'https://accounts.google.com/o/oauth2/v2/auth' +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      '&response_type=code' +
      '&scope=' + encodeURIComponent('openid email profile') +
      '&prompt=select_account' +
      `&state=${encodeURIComponent(state)}`
    window.location.assign(url)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (isLogin) {
        await login(email, password)
      } else {
        await register(name, username, email, password)
      }
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', width: '100%',
      background: '#0e0f13',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* ── Left panel: Kick-style dark branding ── */}
      <div
        className="hidden lg:flex"
        style={{
          width: '50%', flexShrink: 0,
          background: '#13151a',
          borderRight: '1px solid #2a2d33',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 56px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Faint dot grid background */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(#2a2d33 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          opacity: 0.5,
        }} />

        {/* Green glow blob */}
        <div style={{
          position: 'absolute', top: '20%', left: '-20%',
          width: 500, height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(83,252,24,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Top: Logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, background: '#53fc18', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={20} fill="#0a1800" color="#0a1800" />
            </div>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#e8eaed', letterSpacing: '-0.02em' }}>
              StudySync
            </span>
          </div>
        </div>

        {/* Middle: Tagline */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{
            fontSize: 42, fontWeight: 900, color: '#e8eaed',
            lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: 16,
          }}>
            Study Together.<br />
            <span style={{ color: '#53fc18' }}>Learn Better.</span>
          </h1>
          <p style={{ fontSize: 15, color: '#808a93', lineHeight: 1.6, maxWidth: 380 }}>
            Real-time collaborative study rooms with whiteboard, live chat, notes, and video. One link, infinite collaboration.
          </p>
        </div>

        {/* Bottom: Feature pills */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { icon: PenTool, label: 'Infinite collaborative whiteboard', color: '#53fc18', bg: '#1a3a0a' },
              { icon: MessageCircle, label: 'Real-time group chat & reactions', color: '#3d8bff', bg: '#0a1a3a' },
              { icon: Users, label: 'Voice & video with screen share', color: '#ff6b6b', bg: '#2a0a0a' },
            ].map((feat) => (
              <div key={feat.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, background: feat.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <feat.icon size={16} color={feat.color} />
                </div>
                <span style={{ fontSize: 13, color: '#808a93' }}>{feat.label}</span>
              </div>
            ))}
          </div>

          <p style={{ marginTop: 28, fontSize: 12, color: '#3a4048' }}>
            © 2026 StudySync. Collaborative learning platform.
          </p>
        </div>
      </div>

      {/* ── Right panel: Auth form ── */}
      <div style={{
        flex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px',
      }}>
        {/* Mobile logo */}
        <div className="lg:hidden" style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
            <div style={{ width: 36, height: 36, background: '#53fc18', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={18} fill="#0a1800" color="#0a1800" />
            </div>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#e8eaed' }}>StudySync</span>
          </div>
        </div>

        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Toggle tabs */}
          <div style={{
            display: 'flex',
            background: '#16191e',
            border: '1px solid #2a2d33',
            borderRadius: 8,
            padding: 4,
            marginBottom: 28,
          }}>
            {[{ label: 'Log In', v: true }, { label: 'Sign Up', v: false }].map(({ label, v }) => (
              <button
                key={label}
                onClick={() => { setIsLogin(v); setError('') }}
                style={{
                  flex: 1, padding: '10px', borderRadius: 6,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  background: isLogin === v ? '#53fc18' : 'transparent',
                  color: isLogin === v ? '#0a1800' : '#808a93',
                  border: 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Form */}
          <AnimatePresence mode="wait">
            <motion.form
              key={isLogin ? 'login' : 'register'}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              {!isLogin && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#808a93', marginBottom: 6 }}>Full Name</label>
                    <input
                      value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name" required={!isLogin}
                      style={inputStyle} className="focus:[border-color:#53fc18]"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#808a93', marginBottom: 6 }}>Username</label>
                    <input
                      value={username} onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a username" required={!isLogin}
                      style={inputStyle} className="focus:[border-color:#53fc18]"
                    />
                  </div>
                </>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#808a93', marginBottom: 6 }}>Email</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" required autoFocus={isLogin}
                  style={inputStyle} className="focus:[border-color:#53fc18]"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#808a93', marginBottom: 6 }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder={isLogin ? 'Your password' : 'At least 8 characters'}
                    required
                    style={{ ...inputStyle, paddingRight: 44 }}
                    className="focus:[border-color:#53fc18]"
                  />
                  <button
                    type="button" onClick={() => setShowPw((p) => !p)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#808a93',
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  background: '#3a0a0a', border: '1px solid #ff4f4f', borderRadius: 6,
                  padding: '10px 14px', fontSize: 13, color: '#ff6b6b',
                }}>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="btn-kick"
                style={{
                  width: '100%', justifyContent: 'center',
                  padding: '13px', fontSize: 15,
                  opacity: submitting ? 0.7 : 1,
                  marginTop: 4,
                }}
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {isLogin ? 'Log In' : 'Create Account'}
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
                <div style={{ flex: 1, height: 1, background: '#2a2d33' }} />
                <span style={{ fontSize: 12, color: '#3a4048' }}>OR</span>
                <div style={{ flex: 1, height: 1, background: '#2a2d33' }} />
              </div>

              {/* Google OAuth */}
              <button
                type="button"
                onClick={startGoogleLogin}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  background: '#16191e', border: '1px solid #3a4048', borderRadius: 6,
                  padding: '12px', fontSize: 14, fontWeight: 600, color: '#e8eaed', cursor: 'pointer',
                  transition: 'border-color 0.15s ease',
                }}
                className="hover:[border-color:#808a93]"
              >
                {/* Google G icon */}
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#EA4335" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#4285F4" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
                  <path fill="#34A853" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
                Continue with Google
              </button>
            </motion.form>
          </AnimatePresence>

          <p style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: '#808a93' }}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setIsLogin((p) => !p); setError('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#53fc18', fontWeight: 600, fontSize: 13 }}
            >
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
