import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Circle,
  Square,
  Download,
  X,
  Loader2,
  Video,
  Clock,
} from 'lucide-react'

export default function ScreenRecorder({ canvasRef, isOpen, onToggle, onRecordingChange }) {
  const [recording, setRecording] = useState(false)
  const [paused, setPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [saving, setSaving] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)

  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const timerRef = useRef(null)

  const formatDuration = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const startRecording = useCallback(async () => {
    try {
      const targetCanvas = canvasRef?.current
      if (!targetCanvas) {
        alert('Whiteboard canvas not available. Open the whiteboard first.')
        return
      }

      const canvasStream = targetCanvas.captureStream(30)
      streamRef.current = canvasStream

      const recorder = new MediaRecorder(canvasStream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000,
      })

      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        setPreviewUrl(url)
        setSaving(false)
      }

      recorder.start(100)
      recorderRef.current = recorder
      setRecording(true)
      setPaused(false)
      setDuration(0)
      setPreviewUrl(null)
      onRecordingChange?.(true)

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1)
      }, 1000)
    } catch (err) {
      console.error('Recording failed:', err)
      alert('Screen recording is not supported in this browser.')
    }
  }, [canvasRef, onRecordingChange])

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
    }
    clearInterval(timerRef.current)
    setRecording(false)
    setPaused(false)
    onRecordingChange?.(false)
  }, [onRecordingChange])

  const togglePause = useCallback(() => {
    if (!recorderRef.current) return
    if (paused) {
      recorderRef.current.resume()
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000)
      setPaused(false)
    } else {
      recorderRef.current.pause()
      clearInterval(timerRef.current)
      setPaused(true)
    }
  }, [paused])

  const downloadRecording = useCallback(() => {
    if (!previewUrl) return
    setSaving(true)
    const a = document.createElement('a')
    a.href = previewUrl
    a.download = `studysync-recording-${Date.now()}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => setSaving(false), 1000)
  }, [previewUrl])

  const discardRecording = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setDuration(0)
  }, [previewUrl])

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/10 text-white hover:bg-white/15 transition-all duration-150"
        title="Screen Recording"
      >
        <Video size={16} />
      </button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="absolute bottom-14 right-14 z-50 w-60 bg-zoom-dark border border-white/10 rounded-lg shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <div className="flex items-center gap-1.5">
          <Video size={13} className="text-zoom-blue" />
          <span className="text-xs font-semibold text-white">Recorder</span>
        </div>
        <button
          onClick={() => { stopRecording(); onToggle(); }}
          className="w-5 h-5 rounded flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      {/* Content */}
      <div className="px-3 pb-3">
        {!recording && !previewUrl && (
          <div className="text-center py-3">
            <div className="w-12 h-12 rounded-lg bg-red-500/15 flex items-center justify-center mx-auto mb-3">
              <Circle size={22} className="text-red-400" fill="currentColor" />
            </div>
            <p className="text-xs text-white/60 mb-0.5">Record whiteboard session</p>
            <p className="text-[10px] text-white/30 mb-4">
              Captures the whiteboard canvas as a WebM video
            </p>
            <button
              onClick={startRecording}
              className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Circle size={12} fill="currentColor" />
              Start Recording
            </button>
          </div>
        )}

        {recording && (
          <div className="text-center py-3">
            <div className="relative w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center mx-auto mb-3">
              <div className="absolute inset-0 rounded-lg bg-red-500/20 animate-ping" />
              <Circle size={22} className="text-red-400 relative z-10" fill="currentColor" />
            </div>

            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-semibold text-white">
                {paused ? 'Paused' : 'Recording'}
              </span>
            </div>

            <div className="flex items-center justify-center gap-1 mb-4">
              <Clock size={11} className="text-white/30" />
              <span className="text-base font-mono font-bold text-white tracking-tight">
                {formatDuration(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={togglePause}
                className="flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 border border-white/15 text-white/70 hover:bg-white/10 transition-colors"
              >
                {paused ? <><Video size={12} /> Resume</> : <><Pause size={12} /> Pause</>}
              </button>
              <button
                onClick={stopRecording}
                className="flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                <Square size={12} fill="currentColor" />
                Stop
              </button>
            </div>
          </div>
        )}

        {previewUrl && !recording && (
          <div className="py-1.5">
            <video
              src={previewUrl}
              controls
              className="w-full rounded mb-3 bg-black aspect-video object-contain"
            />
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[10px] text-white/35">
                {formatDuration(duration)} recorded
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={downloadRecording}
                disabled={saving}
                className="flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 bg-zoom-blue text-white hover:bg-[#0b5fc7] transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                {saving ? 'Saving...' : 'Download'}
              </button>
              <button
                onClick={discardRecording}
                className="py-2 px-3 rounded-lg text-xs font-medium border border-white/15 text-white/50 hover:bg-white/10 transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function Pause({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}
