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
        className="w-12 h-12 rounded-2xl flex items-center justify-center bg-surface-container-high text-on-surface hover:bg-surface-container-high/80 transition-all duration-200"
        title="Screen Recording"
      >
        <Video size={20} />
      </button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="absolute bottom-20 right-20 z-50 w-72 bg-surface-container-low border border-outline-variant/30 rounded-3xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <Video size={18} className="text-primary" />
          <span className="text-sm font-semibold text-on-surface">Recorder</span>
        </div>
        <button
          onClick={() => { stopRecording(); onToggle(); }}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface/40 hover:bg-surface-container transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="px-5 pb-5">
        {!recording && !previewUrl && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-2xl bg-error-container flex items-center justify-center mx-auto mb-4">
              <Circle size={28} className="text-error" fill="currentColor" />
            </div>
            <p className="text-sm text-on-surface/60 mb-1">Record whiteboard session</p>
            <p className="text-[11px] text-on-surface/30 mb-5">
              Captures the whiteboard canvas as a WebM video
            </p>
            <button
              onClick={startRecording}
              className="w-full py-3 bg-error text-white rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-shadow"
            >
              <Circle size={14} fill="currentColor" />
              Start Recording
            </button>
          </div>
        )}

        {recording && (
          <div className="text-center py-4">
            <div className="relative w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center mx-auto mb-4">
              <div className="absolute inset-0 rounded-2xl bg-error/20 animate-ping" />
              <Circle size={28} className="text-error relative z-10" fill="currentColor" />
            </div>

            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-error animate-pulse" />
              <span className="text-sm font-semibold text-on-surface">
                {paused ? 'Paused' : 'Recording'}
              </span>
            </div>

            <div className="flex items-center justify-center gap-1.5 mb-5">
              <Clock size={12} className="text-on-surface/40" />
              <span className="text-lg font-mono font-bold text-on-surface tracking-tight">
                {formatDuration(duration)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={togglePause}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 border border-outline-variant/30 text-on-surface hover:bg-surface-container transition-colors"
              >
                {paused ? <><Video size={14} /> Resume</> : <><Pause size={14} /> Pause</>}
              </button>
              <button
                onClick={stopRecording}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 bg-error text-white hover:bg-error/90 transition-colors"
              >
                <Square size={14} fill="currentColor" />
                Stop
              </button>
            </div>
          </div>
        )}

        {previewUrl && !recording && (
          <div className="py-2">
            <video
              src={previewUrl}
              controls
              className="w-full rounded-xl mb-4 bg-black aspect-video object-contain"
            />
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] text-on-surface/40">
                {formatDuration(duration)} recorded
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={downloadRecording}
                disabled={saving}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 bg-primary text-on-primary hover:shadow-lg transition-shadow disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {saving ? 'Saving...' : 'Download'}
              </button>
              <button
                onClick={discardRecording}
                className="py-3 px-4 rounded-2xl text-sm font-semibold border border-outline-variant/30 text-on-surface/60 hover:bg-surface-container transition-colors"
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
