import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, Square, Link2, Loader2 } from 'lucide-react'

export default function YoutubePanel({ youtubeState, isHost, emitYoutubeSet, emitYoutubePlay, emitYoutubePause, emitYoutubeStop }) {
  const [url, setUrl] = useState('')
  const [loadingApi, setLoadingApi] = useState(false)
  const playerRef = useRef(null)
  const containerRef = useRef(null)
  const readyRef = useRef(false)

  const extractVideoId = (input) => {
    const match = input.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
    return match ? match[1] : null
  }

  const loadVideo = () => {
    const videoId = extractVideoId(url)
    if (!videoId) return
    emitYoutubeSet(videoId)
    setUrl('')
  }

  const videoId = youtubeState?.videoId || null

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) return
    if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) return
    setLoadingApi(true)
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    tag.onload = () => setLoadingApi(false)
    document.head.appendChild(tag)
  }, [])

  // Create/update player when videoId changes
  useEffect(() => {
    if (!videoId || !containerRef.current) return

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
        videoId,
        playerVars: { autoplay: 0, controls: 1, modestbranding: 1, rel: 0 },
        events: {
          onReady: () => { readyRef.current = true },
        },
      })
    }

    const waitAndCreate = () => {
      if (window.YT && window.YT.Player) { createPlayer() }
      else { const iv = setInterval(() => { if (window.YT && window.YT.Player) { clearInterval(iv); createPlayer() } }, 200) }
    }
    waitAndCreate()
  }, [videoId])

  // Respond to remote play/pause/stop
  useEffect(() => {
    if (!youtubeState || !playerRef.current || !readyRef.current) return
    try {
      if (youtubeState.playing) playerRef.current.playVideo()
      else playerRef.current.pauseVideo()
    } catch {}
  }, [youtubeState?.playing])

  const handlePlay = useCallback(() => {
    if (playerRef.current && readyRef.current) {
      try { playerRef.current.playVideo() } catch {}
    }
    emitYoutubePlay(0)
  }, [emitYoutubePlay])

  const handlePause = useCallback(() => {
    if (playerRef.current && readyRef.current) {
      try { playerRef.current.pauseVideo() } catch {}
    }
    emitYoutubePause(0)
  }, [emitYoutubePause])

  const handleStop = useCallback(() => {
    if (playerRef.current && readyRef.current) {
      try { playerRef.current.stopVideo() } catch {}
    }
    emitYoutubeStop()
  }, [emitYoutubeStop])

  return (
    <div className="space-y-2">
      {isHost && !videoId && (
        <div className="space-y-1.5">
          <div className="flex gap-1.5">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadVideo()}
              placeholder="Paste YouTube link..."
              className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-zoom-blue"
            />
            <button
              onClick={loadVideo}
              disabled={!url.trim()}
              className="shrink-0 px-2.5 py-1.5 bg-zoom-blue text-white rounded text-[11px] font-medium hover:bg-[#0b5fc7] disabled:opacity-40"
            >
              <Link2 size={12} />
            </button>
          </div>
        </div>
      )}

      {!videoId ? (
        <div className="text-[11px] text-white/30 text-center py-8">
          {loadingApi ? (
            <div className="flex items-center justify-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Loading YouTube API...</div>
          ) : isHost ? 'Paste a YouTube link to watch together' : 'Waiting for host to share a video'}
        </div>
      ) : (
        <div className="space-y-2">
          <div ref={containerRef} className="relative w-full aspect-video rounded-lg overflow-hidden bg-black" />

          <div className="flex items-center gap-2">
            <p className="flex-1 min-w-0 text-[10px] text-white/40 truncate">
              {youtubeState?.playing ? 'Playing' : 'Paused'}: {videoId}
            </p>
            <div className="flex gap-1 shrink-0">
              <button onClick={handlePlay} className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-[10px] font-medium hover:bg-green-500/30 transition">
                <Play size={11} className="inline mr-0.5" /> Play
              </button>
              <button onClick={handlePause} className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-[10px] font-medium hover:bg-yellow-500/30 transition">
                <Pause size={11} className="inline mr-0.5" /> Pause
              </button>
              <button onClick={handleStop} className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-[10px] font-medium hover:bg-red-500/30 transition">
                <Square size={11} className="inline mr-0.5" /> Stop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
