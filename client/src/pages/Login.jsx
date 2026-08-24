import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StickyNote, Brain, Eye, EyeOff, Loader2, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const fieldVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
}

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}

export default function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [showPw, setShowPw] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  // Full-page redirect OAuth: no popup, no third-party cookies required.
  const startGoogleLogin = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) {
      setError('Google sign-in is not configured')
      return
    }
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
        await register(name, email, password)
      }
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-surface">
      {/* Left panel — fixed dark branding */}
      <motion.div
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 28 }}
        className="hidden lg:flex relative w-1/2 flex-col justify-between bg-[#151327] p-10 xl:p-14 overflow-hidden"
      >
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize: '200px 200px' }} />

        <div className="relative z-10 max-w-[28rem]">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center">
              <Sparkles size={18} className="text-on-primary-container" />
            </div>
            <span className="font-display text-lg font-bold text-white">StudySync</span>
          </div>

          <h1 className="font-display text-[2.6rem] leading-[1.05] font-bold text-white tracking-tight">
            Master your craft
            <br />
            <span className="text-primary-container">together.</span>
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-white/50 max-w-[24rem]">
            An infinite canvas where ideas meet. Collaborate in real-time, study
            smarter, and build something amazing with your peers.
          </p>
        </div>

        <div className="relative z-10 mt-12 space-y-4">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-64 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-4 shadow-lg shadow-black/20 -rotate-2"
          >
            <StickyNote size={16} className="text-primary-container mb-2" />
            <p className="text-xs leading-relaxed font-medium text-white/85">
              Biology Quiz Prep: Focus on cellular respiration tomorrow!
            </p>
          </motion.div>
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
            className="w-64 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-4 shadow-lg shadow-black/20 rotate-2 ml-10"
          >
            <Brain size={16} className="text-secondary-container mb-2" />
            <p className="text-xs leading-relaxed font-medium text-white/85">
              Brainstorming session for the final project at 4PM.
            </p>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary-container/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-10 w-40 h-40 bg-secondary-container/10 rounded-full blur-3xl pointer-events-none" />
      </motion.div>

      {/* Right panel — form */}
      <motion.div
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 28, delay: 0.15 }}
        className="relative flex w-full lg:w-1/2 flex-col items-center justify-center px-6 py-12 sm:px-10"
      >
        <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />

        <div className="relative z-10 w-full max-w-[24rem]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center">
              <Sparkles size={18} className="text-on-primary-container" />
            </div>
            <span className="font-display text-lg font-bold text-on-surface">StudySync</span>
          </div>

          {/* Tab switcher */}
          <div className="relative flex w-full rounded-full bg-surface-container-high p-1 mb-8 hairline">
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="absolute top-1 bottom-1 w-[calc(50%-2px)] rounded-full bg-primary shadow-sm"
              style={{ left: isLogin ? '4px' : 'calc(50% + 0px)' }}
            />
            {['Sign In', 'Create Account'].map((tab, i) => (
              <button
                key={tab}
                onClick={() => { setIsLogin(i === 0); setError('') }}
                className="relative z-10 flex-1 py-2 text-sm font-semibold rounded-full transition-colors"
              >
                <span className={isLogin === (i === 0) ? 'text-on-primary' : 'text-on-surface/50'}>
                  {tab}
                </span>
              </button>
            ))}
          </div>

          {/* Google login — full-page redirect flow (popup/cookie-proof) */}
          <motion.div variants={stagger} initial="hidden" animate="visible">
            <motion.div variants={fieldVariants} className="w-full flex justify-center">
              <button
                type="button"
                onClick={startGoogleLogin}
                disabled={submitting}
                className="flex items-center justify-center gap-3 w-full max-w-[20rem] py-2.5 rounded-full border border-outline-variant/60 bg-surface-container text-sm font-semibold text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                Continue with Google
              </button>
            </motion.div>
          </motion.div>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-outline-variant/40" />
            <span className="text-xs text-on-surface/30 whitespace-nowrap">Or continue with email</span>
            <div className="flex-1 h-px bg-outline-variant/40" />
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-error-container text-on-error-container text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Form */}
          <AnimatePresence mode="wait">
            <motion.form
              key={isLogin ? 'login' : 'signup'}
              variants={stagger}
              initial="hidden"
              animate="visible"
              exit="exit"
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {!isLogin && (
                <motion.div variants={fieldVariants}>
                  <label className="block text-xs font-medium text-on-surface/50 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full rounded-2xl border border-outline-variant/50 bg-surface-container-lowest px-4 py-3 text-sm text-on-surface placeholder:text-on-surface/30 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </motion.div>
              )}

              <motion.div variants={fieldVariants}>
                <label className="block text-xs font-medium text-on-surface/50 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-2xl border border-outline-variant/50 bg-surface-container-lowest px-4 py-3 text-sm text-on-surface placeholder:text-on-surface/30 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </motion.div>

              <motion.div variants={fieldVariants}>
                <label className="block text-xs font-medium text-on-surface/50 mb-1.5">Password</label>
                <div className="flex items-center rounded-2xl border border-outline-variant/50 bg-surface-container-lowest transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isLogin ? 'Enter your password' : 'Create a password'}
                    className="flex-1 bg-transparent px-4 py-3 text-sm text-on-surface placeholder:text-on-surface/30 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="text-on-surface/30 hover:text-on-surface/60 transition-colors mr-3"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </motion.div>

              {isLogin && (
                <motion.div variants={fieldVariants} className="flex justify-end">
                  <span className="text-xs font-medium text-primary hover:underline cursor-pointer">
                    Forgot Password?
                  </span>
                </motion.div>
              )}

              <motion.div variants={fieldVariants} className="pt-2">
                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileHover={{ scale: 1.005 }}
                  whileTap={{ scale: 0.985 }}
                  className="w-full py-3 rounded-2xl bg-primary text-on-primary text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/35 transition-shadow flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  {isLogin ? 'Sign In' : 'Create Account'}
                </motion.button>
              </motion.div>
            </motion.form>
          </AnimatePresence>

          <p className="mt-8 text-[11px] leading-relaxed text-on-surface/25 text-center">
            By continuing, you agree to our{' '}
            <span className="text-on-surface/45 cursor-pointer hover:underline">Terms</span> and{' '}
            <span className="text-on-surface/45 cursor-pointer hover:underline">Privacy Policy</span>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
