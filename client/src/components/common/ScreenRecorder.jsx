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
        className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#16191e] border border-[#2a2d33] text-[#e8eaed] hover:bg-[#20242b] transition-all duration-150"
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
      className="absolute bottom-14 right-14 z-50 w-64 bg-[#16191e] border border-[#2a2d33] rounded-2xl shadow-2xl overflow-hidden p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#2a2d33] mb-3">
        <div className="flex items-center gap-2">
          <Video size={15} className="text-[#53fc18]" />
          <span className="text-xs font-bold text-[#e8eaed]">Screen Recorder</span>
        </div>
        <button
          onClick={() => { stopRecording(); onToggle(); }}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-[#9b9e9e] hover:text-[#e8eaed] hover:bg-[#20242b] transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      {/* Content */}
      <div>
        {!recording && !previewUrl && (
          <div className="text-center py-3">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-3">
              <Circle size={22} className="text-red-500" fill="currentColor" />
            </div>
            <p className="text-xs font-bold text-[#e8eaed] mb-1">Record Whiteboard Session</p>
            <p className="text-[10px] text-[#9b9e9e] mb-4">
              Captures canvas drawings & notes in real-time
            </p>
            <button
              onClick={startRecording}
              className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg"
            >
              <Circle size={12} fill="currentColor" />
              Start Recording
            </button>
          </div>
        )}

        {recording && (
          <div className="text-center py-3">
            <div className="relative w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-3">
              <div className="absolute inset-0 rounded-2xl bg-red-500/20 animate-ping" />
              <Circle size={22} className="text-red-500 relative z-10" fill="currentColor" />
            </div>

            <div className="flex items-center justify-center gap-1.5 mb-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-bold text-[#e8eaed]">
                {paused ? 'Paused' : 'Recording Live'}
              </span>
            </div>

            <div className="flex items-center justify-center gap-1 mb-4">
              <Clock size={12} className="text-[#9b9e9e]" />
              <span className="text-base font-mono font-bold text-[#53fc18] tracking-tight">
                {formatDuration(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={togglePause}
                className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-[#2a2d33] bg-[#0e0f13] text-[#e8eaed] hover:bg-[#20242b] transition-colors"
              >
                {paused ? <><Video size={13} /> Resume</> : <><Pause size={13} /> Pause</>}
              </button>
              <button
                onClick={stopRecording}
                className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-red-500 text-white hover:bg-red-600 transition-colors shadow-md"
              >
                <Square size={13} fill="currentColor" />
                Stop
              </button>
            </div>
          </div>
        )}

        {previewUrl && !recording && (
          <div className="py-1">
            <video
              src={previewUrl}
              controls
              className="w-full rounded-xl mb-3 bg-[#0e0f13] border border-[#2a2d33] aspect-video object-contain"
            />
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-xs text-[#9b9e9e] font-mono">
                {formatDuration(duration)} recorded
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={downloadRecording}
                disabled={saving}
                className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-[#53fc18] text-black hover:bg-[#48de13] transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                {saving ? 'Saving...' : 'Download'}
              </button>
              <button
                onClick={discardRecording}
                className="py-2 px-3 rounded-xl text-xs font-semibold border border-[#2a2d33] bg-[#0e0f13] text-[#9b9e9e] hover:bg-[#20242b] hover:text-[#e8eaed] transition-colors"
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
