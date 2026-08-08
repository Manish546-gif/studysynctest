import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Bell,
  Settings2,
  X,
} from 'lucide-react'

const PRESETS = [
  { label: 'Classic', work: 25, shortBreak: 5, longBreak: 15, sessions: 4 },
  { label: 'Short Focus', work: 15, shortBreak: 3, longBreak: 10, sessions: 4 },
  { label: 'Deep Work', work: 50, shortBreak: 10, longBreak: 20, sessions: 3 },
  { label: 'Custom', work: 25, shortBreak: 5, longBreak: 15, sessions: 4 },
]

export default function PomodoroTimer({ isOpen, onToggle }) {
  const [preset, setPreset] = useState(PRESETS[0])
  const [workMin, setWorkMin] = useState(25)
  const [shortMin, setShortMin] = useState(5)
  const [longMin, setLongMin] = useState(15)
  const [totalSessions, setTotalSessions] = useState(4)

  const [phase, setPhase] = useState('idle') // idle | work | shortBreak | longBreak | paused
  const [timeLeft, setTimeLeft] = useState(workMin * 60)
  const [completedSessions, setCompletedSessions] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [showNotif, setShowNotif] = useState(false)

  const intervalRef = useRef(null)

  const totalSeconds = phase === 'work' ? workMin * 60
    : phase === 'shortBreak' ? shortMin * 60
    : phase === 'longBreak' ? longMin * 60
    : workMin * 60

  const progress = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0

  const circumference = 2 * Math.PI * 54
  const dashOffset = circumference - (progress / 100) * circumference

  const playNotificationSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 800
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.5)
    } catch {}
  }, [])

  useEffect(() => {
    if (phase === 'idle' || phase === 'paused') {
      clearInterval(intervalRef.current)
      return
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          playNotificationSound()
          setShowNotif(true)
          setTimeout(() => setShowNotif(false), 4000)

          if (phase === 'work') {
            const next = completedSessions + 1
            setCompletedSessions(next)
            if (next % totalSessions === 0) {
              setPhase('longBreak')
              return longMin * 60
            }
            setPhase('shortBreak')
            return shortMin * 60
          } else {
            setPhase('work')
            return workMin * 60
          }
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(intervalRef.current)
  }, [phase, completedSessions, totalSessions, workMin, shortMin, longMin, playNotificationSound])

  const handleStart = () => {
    if (phase === 'idle' || phase === 'paused') {
      setPhase(phase === 'paused' ? (completedSessions % totalSessions === 0 && completedSessions > 0 ? 'longBreak' : 'work') : 'work')
    }
  }

  const handlePause = () => {
    if (phase !== 'idle') {
      setPhase('paused')
    }
  }

  const handleReset = () => {
    clearInterval(intervalRef.current)
    setPhase('idle')
    setTimeLeft(workMin * 60)
    setCompletedSessions(0)
  }

  const applyPreset = (p) => {
    setPreset(p)
    setWorkMin(p.work)
    setShortMin(p.shortBreak)
    setLongMin(p.longBreak)
    setTotalSessions(p.sessions)
    handleReset()
    setShowSettings(false)
  }

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const phaseLabel = phase === 'work' ? 'Focus Time'
    : phase === 'shortBreak' ? 'Short Break'
    : phase === 'longBreak' ? 'Long Break'
    : phase === 'paused' ? 'Paused'
    : 'Ready'

  const phaseColor = phase === 'work' || phase === 'paused' ? 'text-primary'
    : 'text-green-600'

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="w-12 h-12 rounded-2xl flex items-center justify-center bg-tertiary-container text-on-tertiary-container hover:shadow-md transition-all duration-200 relative"
        title="Pomodoro Timer"
      >
        <Timer size={20} />
        {phase !== 'idle' && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-on-primary text-[9px] font-bold flex items-center justify-center">
            {completedSessions}
          </span>
        )}
      </button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="absolute bottom-20 right-4 z-50 w-80 bg-surface-container-low border border-outline-variant/30 rounded-3xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <div className="flex items-center gap-2">
          <Timer size={18} className="text-primary" />
          <span className="text-sm font-semibold text-on-surface">Pomodoro</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface/40 hover:bg-surface-container transition-colors"
          >
            <Settings2 size={14} />
          </button>
          <button
            onClick={onToggle}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface/40 hover:bg-surface-container transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 space-y-3">
              <p className="text-[11px] text-on-surface/40 font-medium uppercase tracking-wider">Presets</p>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      preset.label === p.label
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-on-surface/60 hover:bg-surface-container-high'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {preset.label === 'Custom' && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div>
                    <label className="text-[10px] text-on-surface/40 block mb-1">Focus</label>
                    <input
                      type="number"
                      value={workMin}
                      onChange={(e) => setWorkMin(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-surface rounded-lg px-2 py-1.5 text-xs text-on-surface border border-outline-variant/20 outline-none focus:border-primary"
                      min={1}
                      max={120}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-on-surface/40 block mb-1">Short</label>
                    <input
                      type="number"
                      value={shortMin}
                      onChange={(e) => setShortMin(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-surface rounded-lg px-2 py-1.5 text-xs text-on-surface border border-outline-variant/20 outline-none focus:border-primary"
                      min={1}
                      max={60}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-on-surface/40 block mb-1">Long</label>
                    <input
                      type="number"
                      value={longMin}
                      onChange={(e) => setLongMin(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-surface rounded-lg px-2 py-1.5 text-xs text-on-surface border border-outline-variant/20 outline-none focus:border-primary"
                      min={1}
                      max={60}
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timer circle */}
      <div className="flex flex-col items-center py-6 px-5">
        <div className="relative w-32 h-32 mb-4">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-outline-variant/20"
            />
            <circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className={`transition-all duration-1000 ${
                phase === 'work' || phase === 'paused' ? 'text-primary' : 'text-green-500'
              }`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-mono font-bold text-on-surface tracking-tight">
              {formatTime(timeLeft)}
            </span>
            <span className={`text-[11px] font-semibold mt-1 ${phaseColor}`}>
              {phaseLabel}
            </span>
          </div>
        </div>

        {/* Session dots */}
        <div className="flex items-center gap-2 mb-5">
          {Array.from({ length: totalSessions }).map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                i < completedSessions % totalSessions
                  ? 'bg-primary scale-110'
                  : i === completedSessions % totalSessions && phase === 'work'
                    ? 'bg-primary/30 ring-2 ring-primary/20'
                    : 'bg-outline-variant/30'
              }`}
            />
          ))}
          <span className="text-[10px] text-on-surface/30 ml-1">
            {completedSessions}/{totalSessions}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface/40 hover:bg-surface-container transition-colors"
            title="Reset"
          >
            <RotateCcw size={16} />
          </button>

          <button
            onClick={phase === 'paused' || phase === 'idle' ? handleStart : handlePause}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-on-primary shadow-lg hover:shadow-xl transition-all ${
              phase === 'work' ? 'bg-primary' : phase === 'paused' ? 'bg-primary' : 'bg-green-600'
            }`}
          >
            {phase === 'paused' || phase === 'idle' ? <Play size={22} /> : <Pause size={22} />}
          </button>

          <div className="w-10 h-10" />
        </div>
      </div>

      {/* Notification toast */}
      <AnimatePresence>
        {showNotif && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 bg-primary text-on-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg"
          >
            <Bell size={14} />
            {phase === 'shortBreak' || phase === 'longBreak' ? 'Focus time is up! Take a break.' : 'Break is over! Time to focus.'}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
