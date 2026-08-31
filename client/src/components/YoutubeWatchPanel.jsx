import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Square, X, Link2, MonitorPlay, Trash2 } from 'lucide-react'

export default function YoutubeWatchPanel({ youtubeState, isHost, emitYoutubeSet, emitYoutubePlay, emitYoutubePause, emitYoutubeStop, onClose }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  const videoId = youtubeState?.videoId || null

  const extractVideoId = (input) => {
    if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) return input.trim()
    const match = input.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
    return match ? match[1] : null
  }

  const loadVideo = () => {
    setError('')
    const id = extractVideoId(url)
    if (!id) { setError('Invalid YouTube URL'); return }
    emitYoutubeSet(id)
    setUrl('')
  }

  const handlePlay = useCallback(() => {
    emitYoutubePlay(0)
  }, [emitYoutubePlay])

  const handlePause = useCallback(() => {
    emitYoutubePause(0)
  }, [emitYoutubePause])

  const handleStop = useCallback(() => {
    emitYoutubeStop()
  }, [emitYoutubeStop])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[420px] max-w-[calc(100vw-2rem)]"
    >
      <div className="bg-zoom-dark border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-zoom-darker/50">
          <div className="flex items-center gap-2">
            <MonitorPlay size={14} className="text-red-400" />
            <span className="text-xs font-semibold text-white/90">Watch Together</span>
            {youtubeState?.setBy && (
              <span className="text-[10px] text-white/30">by {youtubeState.setBy}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isHost && videoId && (
              <button onClick={handleStop} className="w-6 h-6 rounded-md flex items-center justify-center bg-red-500/20 text-red-400 hover:bg-red-500/30 transition" title="Remove video">
                <Trash2 size={12} />
              </button>
            )}
            <button onClick={onClose} className="w-6 h-6 rounded-md flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition">
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-3">
          {!videoId ? (
            isHost ? (
              <div className="space-y-2">
                <div className="flex gap-1.5">
                  <input
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); setError('') }}
                    onKeyDown={(e) => e.key === 'Enter' && loadVideo()}
                    placeholder="Paste YouTube link or video ID..."
                    className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-zoom-blue"
                  />
                  <button
                    onClick={loadVideo}
                    disabled={!url.trim()}
                    className="shrink-0 px-3 py-2 bg-zoom-blue text-white rounded-lg text-[11px] font-semibold hover:bg-[#0b5fc7] disabled:opacity-40 flex items-center gap-1.5 transition"
                  >
                    <Link2 size={12} /> Load
                  </button>
                </div>
                {error && <p className="text-[11px] text-red-400">{error}</p>}
                <p className="text-[10px] text-white/25 text-center">Supports youtube.com/watch?v=, youtu.be/, and video IDs</p>
              </div>
            ) : (
              <div className="text-center py-6 space-y-2">
                <MonitorPlay size={24} className="mx-auto text-white/15" />
                <p className="text-[11px] text-white/30">Waiting for host to share a video</p>
              </div>
            )
          ) : (
            <div className="space-y-2">
              {/* Status: playing in stage */}
              <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-white/5 border border-white/10">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[11px] text-white/70">Playing in main stage</span>
                <span className="text-[10px] text-white/30 ml-auto truncate max-w-[140px]">{videoId}</span>
              </div>

              {/* Host controls */}
              {isHost && (
                <div className="flex items-center gap-2">
                  <button onClick={handlePlay} className="flex-1 h-8 rounded-lg flex items-center justify-center gap-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 text-[11px] font-medium transition">
                    <Play size={13} /> Play
                  </button>
                  <button onClick={handlePause} className="flex-1 h-8 rounded-lg flex items-center justify-center gap-1.5 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 text-[11px] font-medium transition">
                    <Pause size={13} /> Pause
                  </button>
                  <button onClick={handleStop} className="flex-1 h-8 rounded-lg flex items-center justify-center gap-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 text-[11px] font-medium transition">
                    <Square size={13} /> Stop
                  </button>
                </div>
              )}

              {/* Replace video (host only) */}
              {isHost && (
                <div className="flex gap-1.5">
                  <input
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); setError('') }}
                    onKeyDown={(e) => e.key === 'Enter' && loadVideo()}
                    placeholder="Replace with another video..."
                    className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-zoom-blue"
                  />
                  <button
                    onClick={loadVideo}
                    disabled={!url.trim()}
                    className="shrink-0 px-3 py-2 bg-zoom-blue text-white rounded-lg text-[11px] font-semibold hover:bg-[#0b5fc7] disabled:opacity-40 flex items-center gap-1.5 transition"
                  >
                    <Link2 size={12} />
                  </button>
                </div>
              )}
              {error && <p className="text-[11px] text-red-400">{error}</p>}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
