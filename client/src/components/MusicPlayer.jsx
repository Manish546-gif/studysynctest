import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Music,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  X,
  ChevronUp,
  Search,
  Radio,
  CloudRain,
  Coffee,
  Waves,
  Brain,
  Clock,
  Sparkles,
  Users,
  User,
  Tv,
  EyeOff,
  Loader2,
  Disc,
  Shuffle,
  ListMusic,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  BookmarkPlus,
  Sliders,
  CheckCircle,
  FolderPlus,
  ShieldCheck,
  Crown,
  Activity,
  Trash2,
  PlusCircle,
  Check,
} from 'lucide-react'
import { api } from '../services/api'
import { useActiveCall } from '../contexts/ActiveCallContext'
import AmbientSoundMixer from './AmbientSoundMixer'
import AudioVisualizer from './AudioVisualizer'
import SaveToPlaylistModal from './SaveToPlaylistModal'

// Curated Distinct Sound Themes (Continuous full-length ambient audio)
export const DISTINCT_SOUND_THEMES = [
  {
    id: 'rain-real',
    name: 'Rain & Storm',
    category: 'Soundscape',
    genre: 'Heavy Rainfall',
    color: '#60a5fa',
    icon: CloudRain,
    audioUrl: 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg',
    desc: 'Real soothing heavy rainfall & distant thunder',
    durationText: 'Continuous Loop',
  },
  {
    id: 'cafe-real',
    name: 'Cafe & Coffee Shop',
    category: 'Soundscape',
    genre: 'Cafe Ambience',
    color: '#ff9f43',
    icon: Coffee,
    audioUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
    desc: 'Real coffeehouse murmur & cup clinks',
    durationText: 'Continuous Loop',
  },
  {
    id: 'waves-real',
    name: 'Ocean Surf',
    category: 'Soundscape',
    genre: 'Coastal Waves',
    color: '#22d3ee',
    icon: Waves,
    audioUrl: 'https://actions.google.com/sounds/v1/water/waves_crashing_on_rock_beach.ogg',
    desc: 'Real rolling waves & ocean tide',
    durationText: 'Continuous Loop',
  },
  {
    id: 'clock-real',
    name: 'Clock Ticking',
    category: 'Soundscape',
    genre: 'Rhythmic Focus',
    color: '#a78bfa',
    icon: Clock,
    audioUrl: 'https://actions.google.com/sounds/v1/household/clock_ticking.ogg',
    desc: 'Real mechanical cadence for flow state',
    durationText: 'Continuous Loop',
  },
  {
    id: 'binaural-alpha',
    name: 'Binaural 10Hz Alpha',
    category: 'Brainwave',
    genre: '432Hz Focus Tone',
    color: '#f472b6',
    icon: Brain,
    isBinaural: true,
    desc: 'Pure dual-sine brainwave synchronizer',
    durationText: 'Endless Synthesis',
  },
  {
    id: 'radio-groove',
    name: 'Groove Salad 24/7',
    category: 'Radio',
    genre: 'Chillout Downtempo',
    color: '#53fc18',
    icon: Radio,
    audioUrl: 'https://ice1.somafm.com/groovesalad-128-mp3',
    desc: 'SomaFM 24/7 full-length chillout radio',
    durationText: '24/7 Live Stream',
  },
  {
    id: 'radio-drone',
    name: 'Drone Zone 24/7',
    category: 'Radio',
    genre: 'Atmospheric Space',
    color: '#c084fc',
    icon: Sparkles,
    audioUrl: 'https://ice1.somafm.com/dronezone-128-mp3',
    desc: 'Space ambient continuous stream for deep study',
    durationText: '24/7 Live Stream',
  },
  {
    id: 'radio-classical',
    name: 'Musopen Classical 24/7',
    category: 'Radio',
    genre: 'Classical & Piano',
    color: '#fbbf24',
    icon: Music,
    audioUrl: 'https://live.musopen.org:8085/streamvbr0',
    desc: 'Continuous full-length piano & orchestral study',
    durationText: '24/7 Live Stream',
  },
]

// Binaural oscillator engine
class BinauralSynth {
  constructor() {
    this.ctx = null
    this.masterGain = null
    this.nodes = []
  }

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) return
      this.ctx = new AudioContextClass()
      this.masterGain = this.ctx.createGain()
      this.masterGain.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  stop() {
    this.nodes.forEach((n) => {
      try {
        if (n.stop) n.stop()
        if (n.disconnect) n.disconnect()
      } catch (e) {}
    })
    this.nodes = []
  }

  setVolume(vol) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime, 0.05)
    }
  }

  play(volume = 0.5) {
    this.init()
    if (!this.ctx) return
    this.stop()
    this.setVolume(volume)

    const merger = this.ctx.createChannelMerger(2)
    const oscL = this.ctx.createOscillator()
    const oscR = this.ctx.createOscillator()
    const gainL = this.ctx.createGain()
    const gainR = this.ctx.createGain()

    oscL.type = 'sine'
    oscR.type = 'sine'
    oscL.frequency.setValueAtTime(216, this.ctx.currentTime)
    oscR.frequency.setValueAtTime(226, this.ctx.currentTime)

    gainL.gain.setValueAtTime(0.2, this.ctx.currentTime)
    gainR.gain.setValueAtTime(0.2, this.ctx.currentTime)

    oscL.connect(gainL)
    oscR.connect(gainR)
    gainL.connect(merger, 0, 0)
    gainR.connect(merger, 0, 1)
    merger.connect(this.masterGain)

    oscL.start()
    oscR.start()
    this.nodes.push(oscL, oscR, gainL, gainR, merger)
  }
}

const binauralEngine = new BinauralSynth()

// Persistent global audio element on window to keep playing across routes
function getGlobalRoomAudio() {
  if (typeof window === 'undefined') return null
  if (!window.__STUDYSYNC_AUDIO__) {
    const audio = new Audio()
    audio.id = 'studysync-global-audio'
    audio.crossOrigin = 'anonymous'
    audio.preload = 'auto'
    window.__STUDYSYNC_AUDIO__ = audio
  }
  return window.__STUDYSYNC_AUDIO__
}

// Persistent global container for YouTube iframe so it never unmounts across page navigation
function getGlobalYTHost() {
  if (typeof document === 'undefined') return null
  let host = document.getElementById('studysync-global-yt-host')
  if (!host) {
    host = document.createElement('div')
    host.id = 'studysync-global-yt-host'
    host.style.position = 'fixed'
    host.style.top = '-9999px'
    host.style.left = '-9999px'
    host.style.width = '384px'
    host.style.height = '160px'
    host.style.zIndex = '55'
    host.style.pointerEvents = 'none'
    host.style.opacity = '0.01'
    host.style.transition = 'opacity 0.2s ease'
    host.style.display = 'flex'
    host.style.alignItems = 'center'
    host.style.justifyContent = 'center'
    host.style.overflow = 'hidden'
    document.body.appendChild(host)
  }
  return host
}

export default function MusicPlayer({ isOpen, onToggle, socket, roomId, isHost, currentUser }) {
  const { updateSession } = useActiveCall()

  // Restore cached global state if available
  const cached = typeof window !== 'undefined' ? window.__STUDYSYNC_MUSIC_STATE__ : null

  const [playing, setPlaying] = useState(cached ? !!cached.playing : false)
  const [activeTab, setActiveTab] = useState('search') // 'search' | 'jukebox' | 'ambient' | 'playlists' | 'soundscapes'
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [currentTrack, setCurrentTrack] = useState(cached?.track || null)
  const [currentTheme, setCurrentTheme] = useState(cached?.theme || DISTINCT_SOUND_THEMES[0])
  const [playbackMode, setPlaybackMode] = useState(cached?.playbackMode || 'track') // 'track' | 'theme'
  const [volume, setVolume] = useState(typeof window !== 'undefined' && window.__STUDYSYNC_MUSIC_VOL__ !== undefined ? window.__STUDYSYNC_MUSIC_VOL__ : 0.7)
  const [muted, setMuted] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [showVideo, setShowVideo] = useState(false) // Video hidden by default
  const [showVisualizer, setShowVisualizer] = useState(true) // Spectrum on by default
  const [syncWithRoom, setSyncWithRoom] = useState(true)
  const [currentTime, setCurrentTime] = useState(cached?.currentTime || 0)
  const [duration, setDuration] = useState(cached?.duration || 0)
  const [loadingAudio, setLoadingAudio] = useState(false)
  const [shuffle, setShuffle] = useState(false)

  // Collaborative Room Jukebox
  const [jukeboxState, setJukeboxState] = useState({ mode: 'open', queue: [], pending: [] })
  const [jukeboxView, setJukeboxView] = useState('queue') // 'queue' | 'pending'

  // Custom Playlists
  const [playlists, setPlaylists] = useState([])
  const [loadingPlaylists, setLoadingPlaylists] = useState(false)
  const [saveModalTrack, setSaveModalTrack] = useState(null)
  const [selectedPlaylist, setSelectedPlaylist] = useState(null)

  const effectiveVolume = muted ? 0 : volume
  const effectiveVolumeRef = useRef(effectiveVolume)
  effectiveVolumeRef.current = effectiveVolume

  const currentVideoIdRef = useRef(typeof window !== 'undefined' ? window.__STUDYSYNC_CURRENT_VID__ || null : null)
  const currentTimeRef = useRef(currentTime)        // Always-current ref readable from stale closures
  currentTimeRef.current = currentTime               // Updated on every render
  const handleNextTrackRef = useRef(null)            // Always points to latest handleNextTrack
  const isScrubbingRef = useRef(false)               // Prevents interval jumps during seeking
  const ytContainerRef = useRef(null)
  const ytReadyRef = useRef(typeof window !== 'undefined' && !!window.__STUDYSYNC_YT_READY__)
  const searchTimeoutRef = useRef(null)
  const progressTimerRef = useRef(null)

  // Keep a ref to the socket so closures always get the latest instance
  const socketRef2 = useRef(socket)
  useEffect(() => { socketRef2.current = socket }, [socket])

  // Jukebox real-time socket events
  useEffect(() => {
    if (!socket || !roomId) return
    // Request current state from server
    socket.emit('jukebox-get-state', { roomId })

    const onJukeboxUpdate = (state) => {
      if (state) setJukeboxState(state)
    }

    socket.on('jukebox-update', onJukeboxUpdate)
    return () => {
      socket.off('jukebox-update', onJukeboxUpdate)
    }
  }, [socket, roomId])

  // Fetch playlists when playlists tab is active
  useEffect(() => {
    if (activeTab === 'playlists') {
      setLoadingPlaylists(true)
      api
        .getPlaylists()
        .then((res) => setPlaylists(res.playlists || []))
        .catch((err) => console.warn('Fetch playlists error:', err))
        .finally(() => setLoadingPlaylists(false))
    }
  }, [activeTab])

  // Watchdog: prevent loading overlay from ever getting stuck for more than 4 seconds
  useEffect(() => {
    if (loadingAudio) {
      const t = setTimeout(() => setLoadingAudio(false), 4000)
      return () => clearTimeout(t)
    }
  }, [loadingAudio])

  // Ensure YouTube IFrame API script is available
  useEffect(() => {
    if (window.YT && window.YT.Player) return
    if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) return
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  }, [])

  // Load trending full-length songs on mount if not already loaded
  useEffect(() => {
    let cancelled = false
    api.getTrendingMusic('lofi')
      .then((data) => {
        if (!cancelled && data.tracks?.length) {
          setSearchResults(data.tracks)
          if (!currentTrack) {
            setCurrentTrack(data.tracks[0])
          }
        }
      })
      .catch((e) => console.warn('Trending music fetch failed:', e.message))
    return () => { cancelled = true }
  }, [])

  // Debounced search for full-length songs
  const handleSearchChange = (val) => {
    setSearchQuery(val)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    if (!val.trim()) {
      api.getTrendingMusic('lofi').then(d => setSearchResults(d.tracks || [])).catch(() => {})
      return
    }

    setSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const data = await api.searchMusic(val, 20)
        setSearchResults(data.tracks || [])
      } catch (err) {
        console.warn('Search music error:', err.message)
      } finally {
        setSearching(false)
      }
    }, 350)
  }

  // Quick genre search tag
  const handleQuickTag = (tag) => {
    setSearchQuery(tag)
    setSearching(true)
    api.searchMusic(tag, 20)
      .then(d => setSearchResults(d.tracks || []))
      .catch(() => {})
      .finally(() => setSearching(false))
  }

  // Broadcast functions (Discord bot style)
  const broadcastPlay = useCallback((item, mode, time = 0) => {
    if (!socket || !roomId || !syncWithRoom) return
    if (mode === 'track' && item) {
      socket.emit('music-play', { roomId, track: item, mode: 'track', currentTime: time })
    } else if (mode === 'theme' && item) {
      socket.emit('music-play', { roomId, stationId: item.id, mode: 'theme', currentTime: time })
    }
  }, [socket, roomId, syncWithRoom])

  const broadcastPause = useCallback((time = 0) => {
    if (!socket || !roomId || !syncWithRoom) return
    socket.emit('music-pause', { roomId, currentTime: time })
  }, [socket, roomId, syncWithRoom])

  const broadcastSeek = useCallback((time) => {
    if (!socket || !roomId || !syncWithRoom) return
    socket.emit('music-seek', { roomId, currentTime: time })
  }, [socket, roomId, syncWithRoom])

  // Request room music state on mount or socket reconnect
  useEffect(() => {
    if (socket && roomId) {
      socket.emit('music-request-sync', { roomId })
    }
  }, [socket, roomId])

  // Synchronize room audio events from server (Discord bot style)
  useEffect(() => {
    if (!socket) return

    const onMusicSync = (data) => {
      if (!syncWithRoom || !data) return

      if (data.mode === 'track' && data.track) {
        setCurrentTrack(data.track)
        setPlaybackMode('track')
      } else if (data.stationId) {
        const found = DISTINCT_SOUND_THEMES.find(t => t.id === data.stationId)
        if (found) {
          setCurrentTheme(found)
          setPlaybackMode('theme')
        }
      }

      setPlaying(!!data.playing)

      if (typeof data.currentTime === 'number') {
        const target = data.currentTime
        setCurrentTime((prev) => {
          // Always apply if we're at the start (joining mid-song), or if drift > 3s
          const shouldSeek = prev < 2 || Math.abs(prev - target) > 3
          if (shouldSeek) {
            const audio = getGlobalRoomAudio()
            if (audio && audio.src && !isNaN(audio.duration)) {
              try { audio.currentTime = target } catch (e) {}
            }
            if (window.__STUDYSYNC_YT_PLAYER__ && ytReadyRef.current) {
              try { window.__STUDYSYNC_YT_PLAYER__.seekTo(target, true) } catch (e) {}
            }
            return target
          }
          return prev
        })
      }
    }

    const onMusicSeek = (data) => {
      if (!syncWithRoom || !data) return
      if (typeof data.currentTime === 'number') {
        const target = data.currentTime
        setCurrentTime((prev) => {
          // Heartbeat: only apply seek if drift > 3s to avoid disruptive micro-seeks
          if (Math.abs(prev - target) > 3) {
            const audio = getGlobalRoomAudio()
            if (audio && audio.src) {
              try { audio.currentTime = target } catch (e) {}
            }
            if (window.__STUDYSYNC_YT_PLAYER__ && ytReadyRef.current) {
              try { window.__STUDYSYNC_YT_PLAYER__.seekTo(target, true) } catch (e) {}
            }
            return target
          }
          return prev
        })
      }
    }

    socket.on('music-sync', onMusicSync)
    socket.on('music-seek', onMusicSeek)

    return () => {
      socket.off('music-sync', onMusicSync)
      socket.off('music-seek', onMusicSeek)
    }
  }, [socket, syncWithRoom])


  // Mount/load YouTube Player dynamically into global host
  const mountYTPlayer = useCallback((videoId, autoPlay = true) => {
    if (!videoId) return
    setLoadingAudio(true)

    const host = getGlobalYTHost()
    if (!host) return

    const create = () => {
      if (!window.YT || !window.YT.Player) {
        setTimeout(create, 150)
        return
      }

      // ── Fast path: reuse existing ready live player ────────────────────────
      const existingPlayer = window.__STUDYSYNC_YT_PLAYER__
      const iframe = existingPlayer && typeof existingPlayer.getIframe === 'function' ? existingPlayer.getIframe() : null
      const isPlayerAlive = iframe && document.contains(iframe) && typeof existingPlayer.loadVideoById === 'function'

      if (isPlayerAlive && ytReadyRef.current) {
        try {
          if (currentVideoIdRef.current !== videoId) {
            // Switching to a different track
            currentVideoIdRef.current = videoId
            window.__STUDYSYNC_CURRENT_VID__ = videoId
            if (autoPlay) {
              existingPlayer.loadVideoById(videoId)
              try { existingPlayer.playVideo() } catch (_) {}
            } else {
              existingPlayer.cueVideoById(videoId)
              setLoadingAudio(false)
            }
            try { existingPlayer.setVolume(effectiveVolumeRef.current * 100) } catch (_) {}
          } else if (autoPlay) {
            // Same video - just resume
            existingPlayer.playVideo()
            try { existingPlayer.setVolume(effectiveVolumeRef.current * 100) } catch (_) {}
            setLoadingAudio(false)
          } else {
            setLoadingAudio(false)
          }
          return
        } catch (e) {
          console.warn('YouTube Player reuse failed, recreating fresh:', e)
          try { existingPlayer.destroy() } catch (_) {}
          window.__STUDYSYNC_YT_PLAYER__ = null
          ytReadyRef.current = false
          window.__STUDYSYNC_YT_READY__ = false
        }
      }

      // ── Slow path: create a brand-new player with clean div ───────────────
      host.innerHTML = ''
      const playerDiv = document.createElement('div')
      playerDiv.id = 'yt-global-player-div'
      playerDiv.style.cssText = 'width:100%;height:100%;position:absolute;top:0;left:0;display:block;'
      host.appendChild(playerDiv)

      currentVideoIdRef.current = videoId
      window.__STUDYSYNC_CURRENT_VID__ = videoId

      window.__STUDYSYNC_YT_PLAYER__ = new window.YT.Player(playerDiv, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: autoPlay ? 1 : 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          iv_load_policy: 3,
          fs: 1,
          cc_load_policy: 0,
        },
        events: {
          onReady: (e) => {
            ytReadyRef.current = true
            window.__STUDYSYNC_YT_READY__ = true
            try {
              e.target.setVolume(effectiveVolumeRef.current * 100)
              // Seek to room-synced position when non-host joins mid-song
              const seekTarget = currentTimeRef.current
              if (seekTarget > 2) {
                e.target.seekTo(seekTarget, true)
              }
              if (autoPlay) e.target.playVideo()
            } catch (err) {}
            setLoadingAudio(false)
          },
          onStateChange: (e) => {
            if (e.data === 0) {      // ENDED → auto-advance via live ref
              setPlaying(false)
              setLoadingAudio(false)
              if (handleNextTrackRef.current) handleNextTrackRef.current()
            } else if (e.data === 1) { // PLAYING → clear loading
              setPlaying(true)
              setLoadingAudio(false)
            } else if (e.data === 2) { // PAUSED
              setPlaying(false)
              setLoadingAudio(false)
            } else if (e.data === 3) { // BUFFERING → show loading
              setLoadingAudio(true)
            } else if (e.data === 5) { // CUED → ready to play
              setLoadingAudio(false)
              if (autoPlay) {
                try { e.target.playVideo() } catch (_) {}
              }
            }
          },
          onError: (e) => {
            console.warn('YouTube Player error code:', e.data)
            setLoadingAudio(false)
            // 101 / 150: embedding disallowed by video owner → skip via live ref
            if (handleNextTrackRef.current) {
              handleNextTrackRef.current()
            }
          }
        }
      })
    }

    create()
  }, []) // Empty deps – never re-created on volume/state changes


  // Playback state coordinator (volume is intentionally decoupled)
  useEffect(() => {
    const audio = getGlobalRoomAudio()
    if (progressTimerRef.current) clearInterval(progressTimerRef.current)

    // Cache state globally so route navigation preserves music
    if (typeof window !== 'undefined') {
      window.__STUDYSYNC_MUSIC_STATE__ = {
        playing,
        playbackMode,
        track: currentTrack,
        theme: currentTheme,
        currentTime,
        duration,
      }
    }

    if (!playing) {
      binauralEngine.stop()
      if (audio) audio.pause()
      if (window.__STUDYSYNC_YT_PLAYER__ && ytReadyRef.current) {
        try { window.__STUDYSYNC_YT_PLAYER__.pauseVideo() } catch (e) {}
      }
      setLoadingAudio(false)
      return
    }

    if (playbackMode === 'track' && currentTrack?.source === 'youtube' && currentTrack.videoId) {
      // YouTube full length song
      binauralEngine.stop()
      if (audio) { audio.pause(); audio.src = '' }
      mountYTPlayer(currentTrack.videoId)

      progressTimerRef.current = setInterval(() => {
        if (window.__STUDYSYNC_YT_PLAYER__ && ytReadyRef.current) {
          try {
            const cur = window.__STUDYSYNC_YT_PLAYER__.getCurrentTime() || 0
            const dur = window.__STUDYSYNC_YT_PLAYER__.getDuration() || currentTrack.duration || 0
            if (!isScrubbingRef.current) {
              setCurrentTime(cur)
            }
            if (dur > 0) setDuration(dur)
          } catch (e) {}
        }
      }, 500)
    } else if (playbackMode === 'track' && currentTrack?.audioUrl) {
      // Audius / direct stream full length track
      binauralEngine.stop()
      if (window.__STUDYSYNC_YT_PLAYER__ && ytReadyRef.current) {
        try { window.__STUDYSYNC_YT_PLAYER__.pauseVideo() } catch (e) {}
      }
      if (audio) {
        setLoadingAudio(true)
        if (audio.src !== currentTrack.audioUrl) {
          audio.src = currentTrack.audioUrl
          audio.load()
        }
        audio.volume = effectiveVolumeRef.current
        audio.play().then(() => setLoadingAudio(false)).catch(() => setLoadingAudio(false))
      }
    } else if (playbackMode === 'theme') {
      // Distinct Soundscapes / Radio
      if (window.__STUDYSYNC_YT_PLAYER__ && ytReadyRef.current) {
        try { window.__STUDYSYNC_YT_PLAYER__.pauseVideo() } catch (e) {}
      }

      if (currentTheme.isBinaural) {
        if (audio) { audio.pause(); audio.src = '' }
        setLoadingAudio(false)
        binauralEngine.play(effectiveVolumeRef.current)
      } else if (audio && currentTheme.audioUrl) {
        binauralEngine.stop()
        setLoadingAudio(true)
        if (audio.src !== currentTheme.audioUrl) {
          audio.src = currentTheme.audioUrl
          audio.load()
        }
        audio.volume = effectiveVolumeRef.current
        audio.loop = true
        audio.play().then(() => setLoadingAudio(false)).catch(() => setLoadingAudio(false))
      }
    }

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    }
  }, [playing, playbackMode, currentTrack, currentTheme, mountYTPlayer])

  // Volume synchronization - ONLY adjusts gain, NEVER restarts tracks!
  useEffect(() => {
    effectiveVolumeRef.current = effectiveVolume
    if (typeof window !== 'undefined') {
      window.__STUDYSYNC_MUSIC_VOL__ = volume
    }
    const audio = getGlobalRoomAudio()
    if (audio) {
      audio.volume = effectiveVolume
    }
    binauralEngine.setVolume(effectiveVolume)
    if (window.__STUDYSYNC_YT_PLAYER__ && ytReadyRef.current) {
      try {
        window.__STUDYSYNC_YT_PLAYER__.setVolume(effectiveVolume * 100)
      } catch (e) {}
    }
  }, [effectiveVolume, volume])

  // HTML5 audio event listeners (time update, duration, end)
  useEffect(() => {
    const audio = getGlobalRoomAudio()
    if (!audio) return

    const onTimeUpdate = () => {
      if (playbackMode !== 'track' || currentTrack?.source !== 'youtube') {
        if (!isScrubbingRef.current) {
          setCurrentTime(audio.currentTime || 0)
        }
      }
    }
    const onLoadedMetadata = () => {
      if (playbackMode !== 'track' || currentTrack?.source !== 'youtube') {
        setDuration(audio.duration || 0)
      }
    }
    const onEnded = () => {
      if (handleNextTrackRef.current) {
        handleNextTrackRef.current()
      } else if (playbackMode === 'track') {
        handleNextTrack()
      }
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
    }
  }, [playbackMode, currentTrack])

  // ── Host heartbeat: broadcast current position every 5s so late-joiners stay in sync
  useEffect(() => {
    if (!isHost || !syncWithRoom || !playing || !socket || !roomId) return
    const interval = setInterval(() => {
      // Read the live playback position (YouTube takes priority)
      let currentSec = currentTimeRef.current
      if (playbackMode === 'track' && currentTrack?.source === 'youtube' &&
          window.__STUDYSYNC_YT_PLAYER__ && ytReadyRef.current) {
        try {
          const ytSec = window.__STUDYSYNC_YT_PLAYER__.getCurrentTime()
          if (typeof ytSec === 'number' && ytSec > 0) currentSec = ytSec
        } catch (e) {}
      }
      socket.emit('music-seek', { roomId, currentTime: currentSec })
    }, 5000)
    return () => clearInterval(interval)
  }, [isHost, syncWithRoom, playing, socket, roomId, playbackMode, currentTrack])

  // Docked YouTube visualizer alignment - positions host directly over visualizer slot without reparenting
  const isYouTubeActive = playbackMode === 'track' && currentTrack?.source === 'youtube'
  useEffect(() => {
    const host = getGlobalYTHost()
    if (!host) return

    if (!document.body.contains(host)) {
      document.body.appendChild(host)
    }

    const updateHostPosition = () => {
      if (isOpen && showVideo && isYouTubeActive && ytContainerRef.current) {
        const rect = ytContainerRef.current.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          host.style.position = 'fixed'
          host.style.top = `${rect.top}px`
          host.style.left = `${rect.left}px`
          host.style.width = `${rect.width}px`
          host.style.height = `${rect.height}px`
          host.style.opacity = '1'
          host.style.pointerEvents = 'auto'
          host.style.zIndex = '55'
          host.style.display = 'flex'
          return
        }
      }
      // Offscreen when closed/minimized/hidden (audio still plays seamlessly)
      host.style.position = 'fixed'
      host.style.top = '-9999px'
      host.style.left = '-9999px'
      host.style.opacity = '0.001'
      host.style.pointerEvents = 'none'
    }

    updateHostPosition()
    const timer = setTimeout(updateHostPosition, 50)
    const animId = requestAnimationFrame(updateHostPosition)
    window.addEventListener('resize', updateHostPosition)
    window.addEventListener('scroll', updateHostPosition, true)

    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', updateHostPosition)
      window.removeEventListener('scroll', updateHostPosition, true)
      if (host) {
        host.style.position = 'fixed'
        host.style.top = '-9999px'
        host.style.left = '-9999px'
        host.style.opacity = '0.001'
        host.style.pointerEvents = 'none'
      }
    }
  }, [isOpen, showVideo, isYouTubeActive, expanded])

  // Play Track
  const handlePlayTrack = (track) => {
    setCurrentTrack(track)
    setPlaybackMode('track')
    setCurrentTime(0)
    setPlaying(true)
    broadcastPlay(track, 'track', 0)
  }

  // Play Theme
  const handlePlayTheme = (theme) => {
    setCurrentTheme(theme)
    setPlaybackMode('theme')
    setCurrentTime(0)
    setPlaying(true)
    broadcastPlay(theme, 'theme', 0)
  }

  // Toggle Play / Pause
  const handleTogglePlay = () => {
    if (playing) {
      setPlaying(false)
      broadcastPause(currentTime)
    } else {
      setPlaying(true)
      broadcastPlay(playbackMode === 'track' ? currentTrack : currentTheme, playbackMode, currentTime)
    }
  }

  // Jukebox Actions
  const handleAddToJukebox = (track) => {
    const s = socketRef2.current
    if (!s || !roomId) return
    s.emit('jukebox-add', { roomId, track })
  }

  const handleVoteJukebox = (queueId, vote) => {
    const s = socketRef2.current
    if (!s || !roomId) return
    s.emit('jukebox-vote', { roomId, queueId, vote })
  }

  const handleApproveJukebox = (queueId) => {
    const s = socketRef2.current
    if (!s || !roomId) return
    s.emit('jukebox-approve', { roomId, queueId })
  }

  const handleRemoveJukebox = (queueId, isPending = false) => {
    const s = socketRef2.current
    if (!s || !roomId) return
    s.emit('jukebox-remove', { roomId, queueId, isPending })
  }

  const handleToggleJukeboxMode = () => {
    const s = socketRef2.current
    if (!s || !roomId) {
      console.warn('[Jukebox] Cannot toggle mode — socket:', !!s, 'roomId:', roomId)
      return
    }
    const newMode = jukeboxState.mode === 'open' ? 'approval' : 'open'
    console.log('[Jukebox] Emitting jukebox-settings:', { roomId, mode: newMode, currentMode: jukeboxState.mode })
    s.emit('jukebox-settings', { roomId, mode: newMode })
  }

  // Playlist Actions
  const handlePlayPlaylist = (pl) => {
    if (!pl || !pl.tracks || pl.tracks.length === 0) return
    setSearchResults(pl.tracks)
    handlePlayTrack(pl.tracks[0])
  }

  const handleDeletePlaylist = async (playlistId, e) => {
    if (e) e.stopPropagation()
    try {
      await api.deletePlaylist(playlistId)
      setPlaylists((prev) => prev.filter((p) => p._id !== playlistId))
      if (selectedPlaylist?._id === playlistId) setSelectedPlaylist(null)
    } catch (err) {
      console.error('Failed to delete playlist:', err)
    }
  }

  const handleRemoveFromPlaylist = async (playlistId, trackId, e) => {
    if (e) e.stopPropagation()
    try {
      const res = await api.removeTrackFromPlaylist(playlistId, trackId)
      if (res.playlist) {
        setSelectedPlaylist(res.playlist)
        setPlaylists((prev) => prev.map((p) => (p._id === playlistId ? res.playlist : p)))
      }
    } catch (err) {
      console.error('Failed to remove track from playlist:', err)
    }
  }

  // Next Track (with seamless recommendations / loop)
  const handleNextTrack = () => {
    // 1. Prioritize room Jukebox queue if populated
    if (socket && roomId && jukeboxState?.queue && jukeboxState.queue.length > 0) {
      socket.emit('jukebox-next', { roomId })
      return
    }

    if (playbackMode === 'track') {
      if (searchResults.length > 0) {
        if (shuffle) {
          const randomIdx = Math.floor(Math.random() * searchResults.length)
          handlePlayTrack(searchResults[randomIdx])
        } else {
          const idx = searchResults.findIndex(t => 
            (t.id && currentTrack?.id && t.id === currentTrack.id) ||
            (t.videoId && currentTrack?.videoId && t.videoId === currentTrack.videoId) ||
            (t.audioUrl && currentTrack?.audioUrl && t.audioUrl === currentTrack.audioUrl)
          )
          if (idx >= 0 && idx < searchResults.length - 1) {
            handlePlayTrack(searchResults[idx + 1])
          } else if (idx === searchResults.length - 1) {
            // End of queue: automatically fetch related recommendations
            const query = currentTrack?.artist || currentTrack?.title || 'lofi hip hop'
            api.searchMusic(query, 10).then((data) => {
              if (data.tracks?.length) {
                const newTracks = data.tracks.filter(nt => !searchResults.some(st => (st.videoId && st.videoId === nt.videoId) || (st.id && st.id === nt.id)))
                if (newTracks.length > 0) {
                  setSearchResults(prev => [...prev, ...newTracks])
                  handlePlayTrack(newTracks[0])
                  return
                }
              }
              handlePlayTrack(searchResults[0])
            }).catch(() => {
              handlePlayTrack(searchResults[0])
            })
          } else {
            handlePlayTrack(searchResults[0])
          }
        }
      } else {
        api.getTrendingMusic('lofi').then((data) => {
          if (data.tracks?.length) {
            setSearchResults(data.tracks)
            handlePlayTrack(data.tracks[0])
          }
        }).catch(() => {})
      }
    } else if (playbackMode === 'theme') {
      const idx = DISTINCT_SOUND_THEMES.findIndex(t => t.id === currentTheme.id)
      const nextIdx = (idx + 1) % DISTINCT_SOUND_THEMES.length
      handlePlayTheme(DISTINCT_SOUND_THEMES[nextIdx])
    }
  }

  // Always keep handleNextTrackRef updated for onStateChange and onEnded
  handleNextTrackRef.current = handleNextTrack

  // Previous Track
  const handlePrevTrack = () => {
    if (playbackMode === 'track' && searchResults.length > 0) {
      if (shuffle) {
        const randomIdx = Math.floor(Math.random() * searchResults.length)
        handlePlayTrack(searchResults[randomIdx])
      } else {
        const idx = searchResults.findIndex(t => 
          (t.id && currentTrack?.id && t.id === currentTrack.id) ||
          (t.videoId && currentTrack?.videoId && t.videoId === currentTrack.videoId) ||
          (t.audioUrl && currentTrack?.audioUrl && t.audioUrl === currentTrack.audioUrl)
        )
        const prevIdx = idx > 0 ? idx - 1 : searchResults.length - 1
        handlePlayTrack(searchResults[prevIdx])
      }
    } else if (playbackMode === 'theme') {
      const idx = DISTINCT_SOUND_THEMES.findIndex(t => t.id === currentTheme.id)
      const prevIdx = (idx - 1 + DISTINCT_SOUND_THEMES.length) % DISTINCT_SOUND_THEMES.length
      handlePlayTheme(DISTINCT_SOUND_THEMES[prevIdx])
    }
  }

  // Seek bar – accepts the target time in seconds directly
  const handleSeek = (targetSec) => {
    const maxDur = duration || currentTrack?.duration || 180
    const t = Math.max(0, Math.min(maxDur, targetSec))
    setCurrentTime(t)

    if (playbackMode === 'track' && currentTrack?.source === 'youtube' && window.__STUDYSYNC_YT_PLAYER__ && ytReadyRef.current) {
      try {
        window.__STUDYSYNC_YT_PLAYER__.seekTo(t, true)
      } catch (err) {}
    } else {
      const audio = getGlobalRoomAudio()
      if (audio && audio.src) {
        try { audio.currentTime = t } catch (err) {}
      }
    }

    broadcastSeek(t)
  }

  const formatSec = (s) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec < 10 ? '0' : ''}${sec}`
  }

  const displayTitle = playbackMode === 'track' ? (currentTrack?.title || 'No song selected') : currentTheme.name
  const displaySubtitle = playbackMode === 'track' ? (currentTrack?.artist || 'Search full songs') : currentTheme.genre
  const displayArtwork = playbackMode === 'track' ? currentTrack?.artwork || currentTrack?.thumbnail : null
  const activeColor = playbackMode === 'track' ? '#53fc18' : currentTheme.color

  // Keep active call dock informed of currently playing music
  useEffect(() => {
    if (updateSession) {
      updateSession({
        currentMusicTitle: playing ? displayTitle : null,
        isMusicPlaying: playing,
      })
    }
  }, [displayTitle, playing, updateSession])

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 25, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 25, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 320, damping: 25 }}
      className="fixed bottom-16 right-4 z-50 w-96 rounded-2xl border border-[#2a2d33] shadow-2xl overflow-hidden backdrop-blur-2xl flex flex-col max-h-[calc(100vh-5rem)]"
      style={{ background: '#101318f2' }}
    >

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2a2d33] bg-[#0c0e12] shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{
              background: activeColor,
              boxShadow: playing ? `0 0 10px ${activeColor}` : 'none'
            }}
          />
          <span className="text-xs font-bold tracking-wide text-white">Full Length Music & Sounds</span>
          {playing && (
            <span className="flex gap-0.5 items-end h-3 ml-1">
              {[4, 9, 13, 7, 11].map((h, i) => (
                <motion.div
                  key={i}
                  className="w-0.5 rounded-full"
                  style={{ background: activeColor }}
                  animate={{ height: [3, h + 2, 3] }}
                  transition={{ duration: 0.45 + i * 0.08, repeat: Infinity }}
                />
              ))}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {isYouTubeActive && (
            <button
              onClick={() => setShowVideo(v => !v)}
              className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
                showVideo ? 'bg-[#53fc18]/20 text-[#53fc18]' : 'text-white/50 hover:text-white hover:bg-white/10'
              }`}
              title={showVideo ? 'Hide video visualizer' : 'Show video visualizer'}
            >
              {showVideo ? <EyeOff size={13} /> : <Tv size={13} />}
            </button>
          )}

          <button
            onClick={() => setShowVisualizer(v => !v)}
            className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
              showVisualizer ? 'bg-[#53fc18]/20 text-[#53fc18]' : 'text-white/50 hover:text-white hover:bg-white/10'
            }`}
            title={showVisualizer ? 'Hide Audio Visualizer' : 'Show Dynamic Audio Visualizer'}
          >
            <Activity size={13} />
          </button>

          <button
            onClick={() => setExpanded(e => !e)}
            className="w-7 h-7 flex items-center justify-center text-white/50 hover:text-white rounded transition-colors"
            title={expanded ? 'Minimize' : 'Expand'}
          >
            <ChevronUp size={14} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={onToggle}
            className="w-7 h-7 flex items-center justify-center text-white/50 hover:text-red-400 rounded transition-colors"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Docked YouTube Player Frame (Full video / visualizer) */}
      <div
        className={`w-full bg-[#0c0e12] transition-all duration-300 relative shrink-0 overflow-hidden ${
          showVideo && isYouTubeActive ? 'h-44 border-b border-[#2a2d33]' : 'h-0 opacity-0 pointer-events-none'
        }`}
      >
        {/* High-res backdrop poster fallback so it's NEVER an empty black box */}
        {displayArtwork && (
          <div className="absolute inset-0 z-0">
            <img
              src={displayArtwork}
              alt=""
              className="w-full h-full object-cover filter brightness-75"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
            {!playing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={handleTogglePlay}
                  className="w-12 h-12 rounded-full bg-[#53fc18] text-[#0e0f13] flex items-center justify-center shadow-2xl hover:scale-110 transition-transform active:scale-95 cursor-pointer"
                  title="Play video"
                >
                  <Play size={20} fill="currentColor" className="ml-0.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Dedicated YouTube Player slot */}
        <div ref={ytContainerRef} className="w-full h-full relative z-10" />

        {/* Buffering indicator */}
        {loadingAudio && (
          <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-xs flex items-center justify-center gap-2 text-xs text-[#53fc18] pointer-events-none">
            <Loader2 size={16} className="animate-spin" />
            <span className="font-semibold">Loading track…</span>
          </div>
        )}
      </div>

      {/* Dynamic Waveform / Spectrum Audio Visualizer */}
      {showVisualizer && (
        <div className="w-full bg-[#0a0c10] border-b border-[#2a2d33] px-3 pt-2 pb-1 shrink-0">
          <AudioVisualizer isPlaying={playing} accentColor={activeColor} />
        </div>
      )}

      {/* Now Playing Bar */}
      <div className="p-3 bg-[#141820] shrink-0">
        <div className="flex items-center gap-3">
          {/* Artwork Thumbnail (when video is hidden or for Audius/Themes) */}
          {(!showVideo || !isYouTubeActive) && (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden shadow-lg border border-white/10 relative"
              style={{ background: '#1c2026' }}
            >
              {displayArtwork ? (
                <img src={displayArtwork} alt="" className="w-full h-full object-cover" />
              ) : (
                <Disc size={22} style={{ color: activeColor }} className={playing ? 'animate-spin' : ''} />
              )}
              {loadingAudio && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                  <Loader2 size={14} className="text-white animate-spin" />
                </div>
              )}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{ background: `${activeColor}25`, color: activeColor }}
              >
                {playbackMode === 'track' ? (currentTrack?.durationText ? `Full Song (${currentTrack.durationText})` : 'Full Track') : currentTheme.category}
              </span>
              {loadingAudio && (
                <span className="text-[10px] text-yellow-300 flex items-center gap-1 animate-pulse">
                  <Loader2 size={10} className="animate-spin" /> Buffering…
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-white truncate mt-0.5 leading-snug">{displayTitle}</p>
            <p className="text-[11px] text-white/60 truncate">{displaySubtitle}</p>
          </div>
        </div>

        {/* Scrubbable Timeline — always shown in track mode */}
        {playbackMode === 'track' && (
          <div className="mt-2.5">
            {/* Visual track + overlay range input */}
            <div className="relative h-5 flex items-center">
              {/* Track background */}
              <div className="absolute inset-x-0 h-1.5 top-1/2 -translate-y-1/2 bg-white/10 rounded-full overflow-hidden">
                {/* Filled portion */}
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (currentTime / Math.max(1, duration || currentTrack?.duration || 1)) * 100)}%`,
                    background: activeColor,
                    transition: playing ? 'width 0.5s linear' : 'none'
                  }}
                />
              </div>
              {/* Transparent range input — handles all click/drag/touch/keyboard */}
              <input
                type="range"
                min="0"
                max={duration || currentTrack?.duration || 100}
                step="0.5"
                value={currentTime}
                onPointerDown={() => { isScrubbingRef.current = true }}
                onPointerUp={() => { isScrubbingRef.current = false }}
                onPointerCancel={() => { isScrubbingRef.current = false }}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
                style={{ zIndex: 10 }}
                title={`${formatSec(currentTime)} / ${currentTrack?.durationText || formatSec(duration)}`}
              />
            </div>
            <div className="flex justify-between text-[10px] text-white/40 font-mono mt-0.5">
              <span>{formatSec(currentTime)}</span>
              <span>{currentTrack?.durationText || formatSec(duration)}</span>
            </div>
          </div>
        )}

        {/* Master Controls */}
        <div className="flex items-center justify-between mt-2.5 px-1">
          <button
            onClick={() => setMuted(m => !m)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted || effectiveVolume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevTrack}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Previous song"
            >
              <SkipBack size={15} />
            </button>

            <button
              onClick={handleTogglePlay}
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-transform active:scale-95 hover:scale-105"
              style={{ background: activeColor, color: '#0e0f13' }}
              title={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
            </button>

            <button
              onClick={handleNextTrack}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Next song"
            >
              <SkipForward size={15} />
            </button>
          </div>

          <button
            onClick={() => setShuffle(s => !s)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              shuffle ? 'text-[#53fc18] bg-[#53fc18]/15' : 'text-white/40 hover:text-white hover:bg-white/10'
            }`}
            title={shuffle ? 'Shuffle: ON' : 'Shuffle: OFF'}
          >
            <Shuffle size={13} />
          </button>
        </div>

        {/* Volume Slider */}
        <div className="mt-2 flex items-center gap-2 px-1">
          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={effectiveVolume}
            onChange={(e) => {
              setVolume(parseFloat(e.target.value))
              setMuted(false)
            }}
            className="flex-1 h-1 rounded-full appearance-none cursor-pointer bg-white/20"
            style={{ accentColor: activeColor }}
          />
          <span className="text-[10px] font-mono text-white/50 w-7 text-right">
            {Math.round(effectiveVolume * 100)}%
          </span>
        </div>

        {/* Room Sync Mode Switcher */}
        <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
          <span className="text-white/60 flex items-center gap-1.5 truncate">
            {syncWithRoom ? <Users size={11} className="text-[#53fc18]" /> : <User size={11} className="text-white/40" />}
            {isHost ? (syncWithRoom ? 'Broadcasting to Room' : 'Solo Mode') : (syncWithRoom ? 'Synced with Room' : 'Personal Study')}
          </span>
          <button
            onClick={() => setSyncWithRoom(s => !s)}
            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition-colors shrink-0 ml-1 ${
              syncWithRoom
                ? 'bg-[#53fc18]/20 text-[#53fc18] border border-[#53fc18]/30'
                : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
            }`}
          >
            {syncWithRoom ? 'Sync: ON' : 'Sync: OFF'}
          </button>
        </div>
      </div>

      {/* Expanded Section (Scrollable inside modal) */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="flex-1 min-h-0 overflow-y-auto border-t border-[#2a2d33] bg-[#0d0f14] custom-scrollbar"
          >
            {/* Tab Buttons */}
            <div className="flex border-b border-white/10 text-xs overflow-x-auto music-scrollbar">
              <button
                onClick={() => setActiveTab('search')}
                className={`flex-1 py-2 px-2 text-center font-bold transition-colors flex items-center justify-center gap-1 shrink-0 ${
                  activeTab === 'search'
                    ? 'text-white border-b-2 border-[#53fc18] bg-white/5'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <Search size={12} />
                Search
              </button>
              <button
                onClick={() => setActiveTab('jukebox')}
                className={`flex-1 py-2 px-2 text-center font-bold transition-colors flex items-center justify-center gap-1 shrink-0 ${
                  activeTab === 'jukebox'
                    ? 'text-white border-b-2 border-[#53fc18] bg-white/5'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <Disc size={12} />
                Jukebox
                {jukeboxState.queue?.length > 0 && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#53fc18]/20 text-[#53fc18] font-mono">
                    {jukeboxState.queue.length}
                  </span>
                )}
                {isHost && jukeboxState.pending?.length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('ambient')}
                className={`flex-1 py-2 px-2 text-center font-bold transition-colors flex items-center justify-center gap-1 shrink-0 ${
                  activeTab === 'ambient'
                    ? 'text-white border-b-2 border-[#53fc18] bg-white/5'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <Sliders size={12} />
                Mixer
              </button>
              <button
                onClick={() => setActiveTab('playlists')}
                className={`flex-1 py-2 px-2 text-center font-bold transition-colors flex items-center justify-center gap-1 shrink-0 ${
                  activeTab === 'playlists'
                    ? 'text-white border-b-2 border-[#53fc18] bg-white/5'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <BookmarkPlus size={12} />
                Playlists
              </button>
              <button
                onClick={() => setActiveTab('soundscapes')}
                className={`flex-1 py-2 px-2 text-center font-bold transition-colors flex items-center justify-center gap-1 shrink-0 ${
                  activeTab === 'soundscapes'
                    ? 'text-white border-b-2 border-[#53fc18] bg-white/5'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <CloudRain size={12} />
                Sounds
              </button>
            </div>

            {/* TAB 1: Search Full Songs */}
            {activeTab === 'search' && (
              <div className="p-3 space-y-2.5">
                {/* Search Input */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search any full song, artist, album..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#181b22] border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#53fc18] transition-colors"
                  />
                  {searching ? (
                    <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#53fc18] animate-spin" />
                  ) : searchQuery ? (
                    <button onClick={() => handleSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                      <X size={13} />
                    </button>
                  ) : null}
                </div>

                {/* Quick Filters */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 music-scrollbar">
                  {['Lofi Hip Hop', 'Coldplay', 'Taylor Swift', 'The Weeknd', 'Chopin Nocturnes', 'Synthwave 80s', 'Ghibli Piano'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleQuickTag(tag)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                {/* Search Results List with full length badges & action buttons */}
                <div className="max-h-52 overflow-y-auto space-y-1 music-scrollbar pr-1">
                  {searchResults.length === 0 ? (
                    <p className="text-center text-xs text-white/40 py-6">
                      {searching ? 'Finding full-length songs…' : 'Search any song above to stream full tracks.'}
                    </p>
                  ) : (
                    searchResults.map((track) => {
                      const isCurrent = playbackMode === 'track' && (
                        (currentTrack?.id && track.id && currentTrack.id === track.id) ||
                        (currentTrack?.videoId && track.videoId && currentTrack.videoId === track.videoId) ||
                        (currentTrack?.audioUrl && track.audioUrl && currentTrack.audioUrl === track.audioUrl)
                      )
                      return (
                        <div
                          key={track.id || track.videoId || track.audioUrl}
                          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all ${
                            isCurrent
                              ? 'bg-[#53fc18]/15 border border-[#53fc18]/40'
                              : 'hover:bg-white/5 border border-transparent'
                          }`}
                        >
                          <img
                            src={track.thumbnail || track.artwork}
                            alt=""
                            className="w-9 h-9 rounded-lg object-cover shrink-0 bg-white/5 border border-white/5"
                          />
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handlePlayTrack(track)}>
                            <p className={`text-xs font-bold truncate ${isCurrent ? 'text-[#53fc18]' : 'text-white'}`}>
                              {track.title}
                            </p>
                            <p className="text-[10px] text-white/50 truncate">{track.artist}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Request in Jukebox */}
                            {roomId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAddToJukebox(track)
                                }}
                                className="p-1 rounded text-white/40 hover:text-[#53fc18] hover:bg-white/10 transition-colors"
                                title="Request in room Jukebox"
                              >
                                <PlusCircle size={14} />
                              </button>
                            )}
                            {/* Save to Playlist */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSaveModalTrack(track)
                              }}
                              className="p-1 rounded text-white/40 hover:text-[#53fc18] hover:bg-white/10 transition-colors"
                              title="Save to custom playlist"
                            >
                              <BookmarkPlus size={14} />
                            </button>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/80 font-mono font-semibold">
                              {track.durationText}
                            </span>
                            <button
                              onClick={() => handlePlayTrack(track)}
                              className="p-1 rounded text-white/40 hover:text-white"
                              title="Play song now"
                            >
                              {isCurrent && playing ? (
                                <div className="w-2 h-2 rounded-full bg-[#53fc18] animate-pulse" />
                              ) : (
                                <Play size={12} className="text-white/40 hover:text-white" />
                              )}
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: Collaborative Room Jukebox */}
            {activeTab === 'jukebox' && (
              <div className="p-3 space-y-3">
                {/* Mode & Host Controls */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2">
                    <Crown size={14} className={isHost ? 'text-amber-400' : 'text-white/40'} />
                    <span className="text-[11px] text-white/80 font-medium">
                      Mode: <span className="font-bold text-white">{jukeboxState.mode === 'open' ? 'Open (Anyone can add)' : 'Host Approval'}</span>
                    </span>
                  </div>
                  {isHost && (
                    <button
                      onClick={handleToggleJukeboxMode}
                      className="text-[10px] px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
                    >
                      Switch to {jukeboxState.mode === 'open' ? 'Approval' : 'Open'}
                    </button>
                  )}
                </div>

                {/* Subtabs for Host if Approval Mode is on */}
                {isHost && jukeboxState.mode === 'approval' && (
                  <div className="flex gap-2 border-b border-white/10 pb-2 text-[11px]">
                    <button
                      onClick={() => setJukeboxView('queue')}
                      className={`font-semibold pb-0.5 ${jukeboxView === 'queue' ? 'text-[#53fc18] border-b border-[#53fc18]' : 'text-white/50 hover:text-white'}`}
                    >
                      Active Queue ({jukeboxState.queue?.length || 0})
                    </button>
                    <button
                      onClick={() => setJukeboxView('pending')}
                      className={`font-semibold pb-0.5 flex items-center gap-1 ${jukeboxView === 'pending' ? 'text-amber-400 border-b border-amber-400' : 'text-white/50 hover:text-white'}`}
                    >
                      Pending Requests ({jukeboxState.pending?.length || 0})
                      {(jukeboxState.pending?.length || 0) > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      )}
                    </button>
                  </div>
                )}

                {/* View: Pending Requests (Host only) */}
                {isHost && jukeboxState.mode === 'approval' && jukeboxView === 'pending' ? (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto music-scrollbar pr-1">
                    {(!jukeboxState.pending || jukeboxState.pending.length === 0) ? (
                      <p className="text-center text-xs text-white/40 py-6">No pending song requests.</p>
                    ) : (
                      jukeboxState.pending.map((item) => (
                        <div key={item.queueId} className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10">
                          <img src={item.thumbnail || item.artwork} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{item.title}</p>
                            <p className="text-[10px] text-white/50 truncate">Req by {item.requestedBy}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleApproveJukebox(item.queueId)}
                              className="p-1 rounded-lg bg-[#53fc18]/20 text-[#53fc18] hover:bg-[#53fc18]/30"
                              title="Approve request"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => handleRemoveJukebox(item.queueId, true)}
                              className="p-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                              title="Decline request"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  /* View: Active Queue */
                  <div className="space-y-1.5 max-h-56 overflow-y-auto music-scrollbar pr-1">
                    {(!jukeboxState.queue || jukeboxState.queue.length === 0) ? (
                      <div className="py-6 flex flex-col items-center gap-2 text-white/30 text-center">
                        <ListMusic size={24} />
                        <p className="text-xs">Queue is empty. Search any track and click "+" to request a song!</p>
                      </div>
                    ) : (
                      jukeboxState.queue.map((item, idx) => {
                        const canDelete = isHost || (currentUser && item.requestedById === (currentUser._id || currentUser.id))
                        return (
                          <div
                            key={item.queueId || idx}
                            className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                          >
                            <span className="text-[10px] font-mono text-white/40 w-4 text-center">{idx + 1}</span>
                            <img src={item.thumbnail || item.artwork} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-white truncate">{item.title}</p>
                              <div className="flex items-center gap-2 text-[10px] text-white/50">
                                <span className="truncate">{item.artist}</span>
                                <span>•</span>
                                <span className="text-[#53fc18] font-medium truncate">by {item.requestedBy}</span>
                              </div>
                            </div>

                            {/* Votes */}
                            <div className="flex items-center gap-1 bg-black/30 px-1.5 py-0.5 rounded-lg border border-white/10 shrink-0">
                              <button
                                onClick={() => handleVoteJukebox(item.queueId, 1)}
                                className="p-0.5 text-white/50 hover:text-[#53fc18] transition-colors"
                                title="Upvote"
                              >
                                <ThumbsUp size={11} />
                              </button>
                              <span className={`text-[11px] font-bold font-mono ${(item.score || 0) > 0 ? 'text-[#53fc18]' : (item.score || 0) < 0 ? 'text-red-400' : 'text-white/60'}`}>
                                {item.score || 0}
                              </span>
                              <button
                                onClick={() => handleVoteJukebox(item.queueId, -1)}
                                className="p-0.5 text-white/50 hover:text-red-400 transition-colors"
                                title="Downvote"
                              >
                                <ThumbsDown size={11} />
                              </button>
                            </div>

                            {/* Host/Requester Remove */}
                            {canDelete && (
                              <button
                                onClick={() => handleRemoveJukebox(item.queueId, false)}
                                className="p-1 text-white/40 hover:text-red-400 transition-colors shrink-0"
                                title="Remove from queue"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Multi-Layer Ambient Sound Mixer */}
            {activeTab === 'ambient' && (
              <div className="p-3">
                <AmbientSoundMixer isParentPlaying={playing} />
              </div>
            )}

            {/* TAB 4: Saved Custom Playlists */}
            {activeTab === 'playlists' && (
              <div className="p-3 space-y-3">
                {selectedPlaylist ? (
                  /* Single Playlist View */
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setSelectedPlaylist(null)}
                        className="text-xs text-white/60 hover:text-white flex items-center gap-1 font-semibold"
                      >
                        ← All Playlists
                      </button>
                      <button
                        onClick={() => handlePlayPlaylist(selectedPlaylist)}
                        className="px-2.5 py-1 rounded-lg bg-[#53fc18] text-[#0e0f13] text-xs font-bold flex items-center gap-1 hover:scale-105 active:scale-95 transition-all shadow-md"
                      >
                        <Play size={12} fill="currentColor" /> Play All
                      </button>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shrink-0 shadow"
                        style={{ background: selectedPlaylist.color || '#53fc18' }}
                      >
                        <Music size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{selectedPlaylist.name}</h4>
                        <p className="text-[10px] text-white/50 truncate">
                          {selectedPlaylist.tracks?.length || 0} tracks {selectedPlaylist.description ? `• ${selectedPlaylist.description}` : ''}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeletePlaylist(selectedPlaylist._id, e)}
                        className="p-1 text-white/40 hover:text-red-400 transition-colors"
                        title="Delete playlist"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Tracks list */}
                    <div className="max-h-52 overflow-y-auto music-scrollbar space-y-1 pr-1">
                      {(!selectedPlaylist.tracks || selectedPlaylist.tracks.length === 0) ? (
                        <p className="text-center text-xs text-white/40 py-6">This playlist is empty. Add songs from Search!</p>
                      ) : (
                        selectedPlaylist.tracks.map((track, idx) => (
                          <div
                            key={track.trackId || track.id || idx}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group"
                          >
                            <span className="text-[10px] text-white/40 font-mono w-4">{idx + 1}</span>
                            <img src={track.thumbnail || track.artwork} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handlePlayTrack(track)}>
                              <p className="text-xs font-semibold text-white truncate group-hover:text-[#53fc18] transition-colors">
                                {track.title}
                              </p>
                              <p className="text-[10px] text-white/50 truncate">{track.artist}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[9px] text-white/40 font-mono">{track.durationText}</span>
                              <button
                                onClick={() => handlePlayTrack(track)}
                                className="p-1 text-white/40 hover:text-white"
                                title="Play song"
                              >
                                <Play size={12} />
                              </button>
                              <button
                                onClick={(e) => handleRemoveFromPlaylist(selectedPlaylist._id, track.trackId || track.id || track.videoId, e)}
                                className="p-1 text-white/40 hover:text-red-400"
                                title="Remove song"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  /* Playlists Grid / List */
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">My Playlists</h4>
                      <button
                        onClick={() => setSaveModalTrack({ title: 'New Collection' })}
                        className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors"
                      >
                        <PlusCircle size={12} /> New Playlist
                      </button>
                    </div>

                    {loadingPlaylists ? (
                      <div className="py-8 flex justify-center text-[#53fc18]">
                        <Loader2 size={20} className="animate-spin" />
                      </div>
                    ) : playlists.length === 0 ? (
                      <div className="py-8 flex flex-col items-center gap-2 text-white/30 text-center">
                        <BookmarkPlus size={26} />
                        <p className="text-xs">No playlists saved yet.</p>
                        <button
                          onClick={() => setSaveModalTrack({ title: 'New Collection' })}
                          className="text-xs font-bold text-[#53fc18] hover:underline"
                        >
                          Create your first playlist
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-56 overflow-y-auto music-scrollbar pr-1">
                        {playlists.map((pl) => (
                          <div
                            key={pl._id}
                            onClick={() => setSelectedPlaylist(pl)}
                            className="flex items-center gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-all group"
                          >
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white shrink-0 shadow"
                              style={{ background: pl.color || '#53fc18' }}
                            >
                              <Music size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-bold text-white truncate group-hover:text-[#53fc18] transition-colors">{pl.name}</h5>
                              <p className="text-[10px] text-white/50 truncate">
                                {pl.tracks?.length || 0} tracks {pl.description ? `• ${pl.description}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handlePlayPlaylist(pl)
                                }}
                                className="p-1.5 rounded-lg bg-white/10 hover:bg-[#53fc18] hover:text-black text-white transition-colors"
                                title="Play All"
                              >
                                <Play size={12} fill="currentColor" />
                              </button>
                              <button
                                onClick={(e) => handleDeletePlaylist(pl._id, e)}
                                className="p-1.5 text-white/40 hover:text-red-400 transition-colors"
                                title="Delete playlist"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: Real Soundscapes */}
            {activeTab === 'soundscapes' && (
              <div className="p-3">
                <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-2">
                  100% Real Distinct Audio Environments
                </p>
                <div className="max-h-56 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                  {DISTINCT_SOUND_THEMES.map((theme) => {
                    const isCurrent = playbackMode === 'theme' && currentTheme.id === theme.id
                    const ThemeIcon = theme.icon || CloudRain
                    return (
                      <button
                        key={theme.id}
                        onClick={() => handlePlayTheme(theme)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${
                          isCurrent
                            ? 'bg-white/10 border border-white/20'
                            : 'hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            background: `${theme.color}25`,
                            color: theme.color,
                            border: isCurrent ? `1px solid ${theme.color}60` : 'none'
                          }}
                        >
                          <ThemeIcon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold truncate ${isCurrent ? 'text-white' : 'text-white/80'}`}>
                            {theme.name}
                          </p>
                          <p className="text-[10px] text-white/40 truncate">{theme.desc}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/50 font-mono">
                            {theme.durationText}
                          </span>
                          {isCurrent && playing ? (
                            <div className="w-2 h-2 rounded-full" style={{ background: theme.color }} />
                          ) : (
                            <Play size={12} className="text-white/30" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save to Playlist Modal */}
      {saveModalTrack && (
        <SaveToPlaylistModal
          track={saveModalTrack}
          isOpen={!!saveModalTrack}
          onClose={() => setSaveModalTrack(null)}
          onPlaylistUpdated={(updatedPlaylist) => {
            setPlaylists((prev) => {
              const idx = prev.findIndex((p) => p._id === updatedPlaylist._id)
              if (idx >= 0) {
                const next = [...prev]
                next[idx] = updatedPlaylist
                return next
              }
              return [updatedPlaylist, ...prev]
            })
          }}
        />
      )}
    </motion.div>
  )
}
