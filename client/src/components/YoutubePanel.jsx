import { useState, useEffect, useRef } from 'react'
import { Play, Pause, Square, Link2, ExternalLink } from 'lucide-react'

export default function YoutubePanel({ youtubeState, isHost, emitYoutubeSet, emitYoutubePlay, emitYoutubePause, emitYoutubeStop }) {
  const [url, setUrl] = useState('')
  const iframeRef = useRef(null)

  const extractVideoId = (input) => {
    const match = input.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
    return match ? match[1] : null
  }

  const loadVideo = () => {
    const videoId = extractVideoId(url)
    if (!videoId) return
    emitYoutubeSet(`https://www.youtube.com/embed/${videoId}`)
    setUrl('')
  }

  const videoId = youtubeState?.videoId || null

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
          {isHost ? 'Paste a YouTube link to watch together' : 'Waiting for host to share a video'}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
            <iframe
              ref={iframeRef}
              src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="YouTube video"
            />
          </div>
          <div className="flex items-center gap-2">
            <p className="flex-1 min-w-0 text-[10px] text-white/40 truncate">
              Playing: {videoId}
            </p>
            {isHost && (
              <div className="flex gap-1 shrink-0">
                <button onClick={() => emitYoutubePlay(0)} className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-[10px] font-medium hover:bg-green-500/30 transition">
                  <Play size={11} className="inline mr-0.5" /> Play
                </button>
                <button onClick={() => emitYoutubePause(0)} className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-[10px] font-medium hover:bg-yellow-500/30 transition">
                  <Pause size={11} className="inline mr-0.5" /> Pause
                </button>
                <button onClick={emitYoutubeStop} className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-[10px] font-medium hover:bg-red-500/30 transition">
                  <Square size={11} className="inline mr-0.5" /> Stop
                </button>
              </div>
            )}
          </div>
          <p className="text-[10px] text-white/25 text-center">
            Note: Sync is basic (set video). Individual playback controls are independent.
          </p>
        </div>
      )}
    </div>
  )
}
