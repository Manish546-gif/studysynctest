import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StickyNote, Brain, Eye, EyeOff, Loader2, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
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
  const { login, register, googleLogin } = useAuth()
  const navigate = useNavigate()

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
      {/* Left panel */}
      <motion.div
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 28 }}
        className="hidden lg:flex relative w-1/2 flex-col justify-between bg-[#151327] p-10 xl:p-14 overflow-hidden"
      >
        <div className="absolute inset-0 mesh-aurora opacity-70 pointer-events-none" style={{ '--color-primary-container': '#3b2f8f', '--color-secondary-container': '#14544c', '--color-tertiary-container': '#7f3a2d' }} />
        <div className="absolute inset-0 bg-gradient-to-br from-[#2a1d6b]/40 via-transparent to-[#0f0d1c] pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize: '200px 200px' }} />

        <div className="relative z-10 max-w-[28rem]">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c3b8ff] to-[#7fd8c9] flex items-center justify-center shadow-lg shadow-black/30">
              <Sparkles size={18} className="text-[#241877]" />
            </div>
            <span className="font-display text-lg font-bold text-white">StudySync</span>
          </div>

          <h1 className="font-display text-[2.6rem] leading-[1.05] font-bold text-white tracking-tight">
            Master your craft
            <br />
            <span className="text-[#c3b8ff]">together.</span>
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
            <StickyNote size={16} className="text-[#c3b8ff] mb-2" />
            <p className="text-xs leading-relaxed font-medium text-white/85">
              Biology Quiz Prep: Focus on cellular respiration tomorrow!
            </p>
          </motion.div>
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
            className="w-64 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-4 shadow-lg shadow-black/20 rotate-2 ml-10"
          >
            <Brain size={16} className="text-[#7fd8c9] mb-2" />
            <p className="text-xs leading-relaxed font-medium text-white/85">
              Brainstorming session for the final project at 4PM.
            </p>
          </motion.div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex -space-x-2">
            {['A', 'M', 'K'].map((init, i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-[#151327] bg-gradient-to-br from-[#c3b8ff] to-[#7fd8c9] flex items-center justify-center text-[10px] font-bold text-[#151327] font-display">
                {init}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-white/40">
            Trusted by <span className="text-white/70 font-medium">50,000+</span> students
          </p>
        </div>

        <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#c3b8ff]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-10 w-40 h-40 bg-[#7fd8c9]/10 rounded-full blur-3xl pointer-events-none" />
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
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-tertiary flex items-center justify-center">
              <Sparkles size={18} className="text-on-primary" />
            </div>
            <span className="font-display text-lg font-bold text-on-surface">StudySync</span>
          </div>

          <div className="relative flex w-full rounded-full bg-surface-container-high p-1 mb-8 hairline">
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="absolute top-1 bottom-1 w-[calc(50%-2px)] rounded-full bg-gradient-to-r from-primary to-tertiary shadow-sm"
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

          <motion.div variants={stagger} initial="hidden" animate="visible">
            <motion.div
              variants={fieldVariants}
              className="w-full flex justify-center"
            >
              <GoogleLogin
                onSuccess={async (credentialResponse) => {
                  try {
                    setError('')
                    await googleLogin(credentialResponse.credential)
                    navigate('/dashboard')
                  } catch (err) {
                    setError(err.message)
                  }
                }}
                onError={() => setError('Google sign-in failed')}
                theme="outline"
                shape="pill"
                size="large"
                text="continue_with"
              />
            </motion.div>
          </motion.div>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-outline-variant/40" />
            <span className="text-xs text-on-surface/30 whitespace-nowrap">Or continue with email</span>
            <div className="flex-1 h-px bg-outline-variant/40" />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-error-container text-on-error-container text-sm"
            >
              {error}
            </motion.div>
          )}

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
                  <div className="flex items-center rounded-2xl border border-outline-variant/50 bg-surface-container-lowest px-4 py-3 transition-all focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(91,70,214,0.15)]">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface/30 outline-none"
                    />
                  </div>
                </motion.div>
              )}

              <motion.div variants={fieldVariants}>
                <label className="block text-xs font-medium text-on-surface/50 mb-1.5">Email</label>
                <div className="flex items-center rounded-2xl border border-outline-variant/50 bg-surface-container-lowest px-4 py-3 transition-all focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(91,70,214,0.15)]">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface/30 outline-none"
                  />
                </div>
              </motion.div>

              <motion.div variants={fieldVariants}>
                <label className="block text-xs font-medium text-on-surface/50 mb-1.5">Password</label>
                <div className="flex items-center rounded-2xl border border-outline-variant/50 bg-surface-container-lowest px-4 py-3 transition-all focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(91,70,214,0.15)]">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isLogin ? 'Enter your password' : 'Create a password'}
                    className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface/30 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="text-on-surface/30 hover:text-on-surface/60 transition-colors ml-2"
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
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-primary to-tertiary text-on-primary text-sm font-semibold overflow-hidden shadow-lg shadow-primary/20 hover:shadow-primary/35 transition-shadow flex items-center justify-center gap-2 disabled:opacity-60"
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
