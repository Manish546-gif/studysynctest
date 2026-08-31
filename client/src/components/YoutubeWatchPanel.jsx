import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, Square, X, Link2, Loader2, Trash2, MonitorPlay, Users, Volume2, VolumeOff } from 'lucide-react'

export default function YoutubeWatchPanel({ youtubeState, isHost, emitYoutubeSet, emitYoutubePlay, emitYoutubePause, emitYoutubeStop, onClose }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [muted, setMuted] = useState(false)
  const [loadingApi, setLoadingApi] = useState(false)
  const playerRef = useRef(null)
  const containerRef = useRef(null)
  const readyRef = useRef(false)
  const pollRef = useRef(null)

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

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) return
    if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) return
    setLoadingApi(true)
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    tag.onload = () => setLoadingApi(false)
    tag.onerror = () => setLoadingApi(false)
    document.head.appendChild(tag)
  }, [])

  // Create player when videoId changes
  useEffect(() => {
    if (!videoId || !containerRef.current) return
    setError('')

    const createPlayer = () => {
      if (playerRef.current) {
        try { playerRef.current.loadVideoById(videoId) } catch {}
        return
      }

      const playerDiv = document.createElement('div')
      playerDiv.id = 'yt-player-' + Date.now()
      containerRef.current.innerHTML = ''
      containerRef.current.appendChild(playerDiv)

      playerRef.current = new window.YT.Player(playerDiv, {
        height: '100%',
        width: '100%',
        videoId,
        playerVars: { autoplay: 0, controls: 1, modestbranding: 1, rel: 0, fs: 0 },
        events: {
          onReady: () => { readyRef.current = true },
          onError: () => { setError('Failed to load video') },
        },
      })
    }

    const waitForAPI = () => {
      if (window.YT && window.YT.Player) { createPlayer() }
      else {
        const iv = setInterval(() => {
          if (window.YT && window.YT.Player) { clearInterval(iv); createPlayer() }
        }, 200)
        setTimeout(() => clearInterval(iv), 10000)
      }
    }
    waitForAPI()
  }, [videoId])

  // Respond to remote play/pause/stop
  useEffect(() => {
    if (!youtubeState || !playerRef.current || !readyRef.current) return
    try {
      if (youtubeState.playing) playerRef.current.playVideo()
      else playerRef.current.pauseVideo()
    } catch {}
  }, [youtubeState?.playing])

  // Cleanup player on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try { playerRef.current.destroy() } catch {}
        playerRef.current = null
      }
    }
  }, [])

  const handlePlay = useCallback(() => {
    if (playerRef.current && readyRef.current) { try { playerRef.current.playVideo() } catch {} }
    emitYoutubePlay(0)
  }, [emitYoutubePlay])

  const handlePause = useCallback(() => {
    if (playerRef.current && readyRef.current) { try { playerRef.current.pauseVideo() } catch {} }
    emitYoutubePause(0)
  }, [emitYoutubePause])

  const handleStop = useCallback(() => {
    if (playerRef.current && readyRef.current) { try { playerRef.current.stopVideo() } catch {} }
    emitYoutubeStop()
  }, [emitYoutubeStop])

  const handleMuteToggle = useCallback(() => {
    if (playerRef.current && readyRef.current) {
      try {
        if (muted) playerRef.current.unMute()
        else playerRef.current.mute()
      } catch {}
    }
    setMuted((m) => !m)
  }, [muted])

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
                {loadingApi ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-white/40">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-xs">Loading YouTube API...</span>
                  </div>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-8 space-y-2">
                <MonitorPlay size={24} className="mx-auto text-white/15" />
                <p className="text-[11px] text-white/30">Waiting for host to share a video</p>
              </div>
            )
          ) : (
            <div className="space-y-2">
              {/* Video player */}
              <div ref={containerRef} className="relative w-full aspect-video rounded-lg overflow-hidden bg-black" />

              {error && <p className="text-[11px] text-red-400 text-center">{error}</p>}

              {/* Controls */}
              <div className="flex items-center gap-2">
                <button onClick={handleMuteToggle} className="w-7 h-7 rounded-md flex items-center justify-center bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80 transition" title={muted ? 'Unmute' : 'Mute'}>
                  {muted ? <VolumeOff size={13} /> : <Volume2 size={13} />}
                </button>

                <div className="flex-1 flex items-center justify-center gap-1.5">
                  <button onClick={handlePlay} className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-500/20 text-green-400 hover:bg-green-500/30 transition" title="Play">
                    <Play size={14} />
                  </button>
                  <button onClick={handlePause} className="w-8 h-8 rounded-lg flex items-center justify-center bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition" title="Pause">
                    <Pause size={14} />
                  </button>
                  <button onClick={handleStop} className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/20 text-red-400 hover:bg-red-500/30 transition" title="Stop">
                    <Square size={14} />
                  </button>
                </div>

                <span className="text-[10px] text-white/30 shrink-0">{videoId}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
