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
  ChevronRight
} from 'lucide-react'
import { api } from '../services/api'
import { useActiveCall } from '../contexts/ActiveCallContext'

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

export default function MusicPlayer({ isOpen, onToggle, socket, roomId, isHost }) {
  const { updateSession } = useActiveCall()

  // Restore cached global state if available
  const cached = typeof window !== 'undefined' ? window.__STUDYSYNC_MUSIC_STATE__ : null

  const [playing, setPlaying] = useState(cached ? !!cached.playing : false)
  const [activeTab, setActiveTab] = useState('search') // 'search' | 'soundscapes'
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [currentTrack, setCurrentTrack] = useState(cached?.track || null)
  const [currentTheme, setCurrentTheme] = useState(cached?.theme || DISTINCT_SOUND_THEMES[0])
  const [playbackMode, setPlaybackMode] = useState(cached?.playbackMode || 'track') // 'track' | 'theme'
  const [volume, setVolume] = useState(typeof window !== 'undefined' && window.__STUDYSYNC_MUSIC_VOL__ !== undefined ? window.__STUDYSYNC_MUSIC_VOL__ : 0.7)
  const [muted, setMuted] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [showVideo, setShowVideo] = useState(true) // Show video player by default for full song visualizer
  const [syncWithRoom, setSyncWithRoom] = useState(true)
  const [currentTime, setCurrentTime] = useState(cached?.currentTime || 0)
  const [duration, setDuration] = useState(cached?.duration || 0)
  const [loadingAudio, setLoadingAudio] = useState(false)
  const [shuffle, setShuffle] = useState(false)

  const effectiveVolume = muted ? 0 : volume
  const effectiveVolumeRef = useRef(effectiveVolume)
  effectiveVolumeRef.current = effectiveVolume

  const currentVideoIdRef = useRef(typeof window !== 'undefined' ? window.__STUDYSYNC_CURRENT_VID__ || null : null)
  const ytContainerRef = useRef(null)
  const ytReadyRef = useRef(typeof window !== 'undefined' && !!window.__STUDYSYNC_YT_READY__)
  const searchTimeoutRef = useRef(null)
  const progressTimerRef = useRef(null)

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
          if (Math.abs(prev - target) > 1.8) {
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
        setCurrentTime(target)
        const audio = getGlobalRoomAudio()
        if (audio && audio.src) {
          try { audio.currentTime = target } catch (e) {}
        }
        if (window.__STUDYSYNC_YT_PLAYER__ && ytReadyRef.current) {
          try { window.__STUDYSYNC_YT_PLAYER__.seekTo(target, true) } catch (e) {}
        }
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

      // If already playing this exact video
      if (window.__STUDYSYNC_YT_PLAYER__ && ytReadyRef.current) {
        try {
          if (currentVideoIdRef.current !== videoId) {
            currentVideoIdRef.current = videoId
            window.__STUDYSYNC_CURRENT_VID__ = videoId
            if (autoPlay) {
              window.__STUDYSYNC_YT_PLAYER__.loadVideoById(videoId)
              window.__STUDYSYNC_YT_PLAYER__.playVideo()
            } else {
              window.__STUDYSYNC_YT_PLAYER__.cueVideoById(videoId)
            }
          } else if (autoPlay) {
            window.__STUDYSYNC_YT_PLAYER__.playVideo()
          }
          window.__STUDYSYNC_YT_PLAYER__.setVolume(effectiveVolumeRef.current * 100)
          setLoadingAudio(false)
          return
        } catch (e) {
          window.__STUDYSYNC_YT_PLAYER__ = null
          ytReadyRef.current = false
          window.__STUDYSYNC_YT_READY__ = false
        }
      }

      let playerDiv = document.getElementById('yt-global-player-div')
      if (!playerDiv) {
        playerDiv = document.createElement('div')
        playerDiv.id = 'yt-global-player-div'
        playerDiv.style.cssText = 'width:100%;height:100%;position:absolute;top:0;left:0;display:block;'
        host.innerHTML = ''
        host.appendChild(playerDiv)
      } else {
        // Re-apply sizing in case styles were lost
        playerDiv.style.cssText = 'width:100%;height:100%;position:absolute;top:0;left:0;display:block;'
      }

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
          rel: 1,
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
              if (autoPlay) e.target.playVideo()
            } catch (err) {}
            setLoadingAudio(false)
          },
          onStateChange: (e) => {
            if (e.data === 0) { // ENDED -> auto advance
              handleNextTrack()
            } else if (e.data === 1) { // PLAYING
              setPlaying(true)
              setLoadingAudio(false)
            } else if (e.data === 2) { // PAUSED
              setPlaying(false)
            }
          },
          onError: (e) => {
            console.warn('YouTube Player error code:', e.data)
            setLoadingAudio(false)
            // Error 101 or 150: Video owner does not allow embedding
            if (e.data === 101 || e.data === 150) {
              handleNextTrack()
            }
          }
        }
      })
    }

    create()
  }, []) // Empty dependencies! Never re-created on volume changes!

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
            setCurrentTime(cur)
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
        setCurrentTime(audio.currentTime || 0)
      }
    }
    const onLoadedMetadata = () => {
      if (playbackMode !== 'track' || currentTrack?.source !== 'youtube') {
        setDuration(audio.duration || 0)
      }
    }
    const onEnded = () => {
      if (playbackMode === 'track') handleNextTrack()
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

  // Docked YouTube visualizer alignment - mounts host directly inside visualizer slot
  const isYouTubeActive = playbackMode === 'track' && currentTrack?.source === 'youtube'
  useEffect(() => {
    const host = getGlobalYTHost()
    if (!host) return

    if (isOpen && showVideo && isYouTubeActive && ytContainerRef.current) {
      host.style.position = 'absolute'
      host.style.inset = '0'
      host.style.top = '0'
      host.style.left = '0'
      host.style.width = '100%'
      host.style.height = '100%'
      host.style.opacity = '1'
      host.style.pointerEvents = 'auto'
      host.style.zIndex = '10'
      host.style.display = 'flex'
      host.style.alignItems = 'center'
      host.style.justifyContent = 'center'
      host.style.overflow = 'hidden'
      if (!ytContainerRef.current.contains(host)) {
        ytContainerRef.current.appendChild(host)
      }

      return () => {
        if (document.body && !document.body.contains(host)) {
          document.body.appendChild(host)
        }
        host.style.position = 'fixed'
        host.style.top = '-9999px'
        host.style.left = '-9999px'
        host.style.opacity = '0.01'
        host.style.pointerEvents = 'none'
      }
    } else {
      if (document.body && !document.body.contains(host)) {
        document.body.appendChild(host)
      }
      host.style.position = 'fixed'
      host.style.top = '-9999px'
      host.style.left = '-9999px'
      host.style.opacity = '0.01'
      host.style.pointerEvents = 'none'
    }
  }, [isOpen, showVideo, isYouTubeActive])

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

  // Next Track
  const handleNextTrack = () => {
    if (playbackMode === 'track' && searchResults.length > 0) {
      if (shuffle) {
        const randomIdx = Math.floor(Math.random() * searchResults.length)
        handlePlayTrack(searchResults[randomIdx])
      } else {
        const idx = searchResults.findIndex(t => t.id === currentTrack?.id)
        const nextIdx = (idx + 1) % searchResults.length
        handlePlayTrack(searchResults[nextIdx])
      }
    } else if (playbackMode === 'theme') {
      const idx = DISTINCT_SOUND_THEMES.findIndex(t => t.id === currentTheme.id)
      const nextIdx = (idx + 1) % DISTINCT_SOUND_THEMES.length
      handlePlayTheme(DISTINCT_SOUND_THEMES[nextIdx])
    }
  }

  // Previous Track
  const handlePrevTrack = () => {
    if (playbackMode === 'track' && searchResults.length > 0) {
      if (shuffle) {
        const randomIdx = Math.floor(Math.random() * searchResults.length)
        handlePlayTrack(searchResults[randomIdx])
      } else {
        const idx = searchResults.findIndex(t => t.id === currentTrack?.id)
        const prevIdx = (idx - 1 + searchResults.length) % searchResults.length
        handlePlayTrack(searchResults[prevIdx])
      }
    } else if (playbackMode === 'theme') {
      const idx = DISTINCT_SOUND_THEMES.findIndex(t => t.id === currentTheme.id)
      const prevIdx = (idx - 1 + DISTINCT_SOUND_THEMES.length) % DISTINCT_SOUND_THEMES.length
      handlePlayTheme(DISTINCT_SOUND_THEMES[prevIdx])
    }
  }

  // Seek bar scrub
  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    const targetSec = Math.max(0, Math.min(duration || currentTrack?.duration || 180, pos * (duration || currentTrack?.duration || 180)))

    setCurrentTime(targetSec)

    if (playbackMode === 'track' && currentTrack?.source === 'youtube' && window.__STUDYSYNC_YT_PLAYER__ && ytReadyRef.current) {
      try {
        window.__STUDYSYNC_YT_PLAYER__.seekTo(targetSec, true)
      } catch (err) {}
    } else {
      const audio = getGlobalRoomAudio()
      if (audio && audio.src) {
        try { audio.currentTime = targetSec } catch (err) {}
      }
    }

    broadcastSeek(targetSec)
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
          <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-xs flex items-center justify-center gap-2 text-xs text-[#53fc18]">
            <Loader2 size={16} className="animate-spin" />
            <span className="font-semibold">Loading track…</span>
          </div>
        )}
      </div>

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
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
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

        {/* Scrubbable Timeline */}
        {playbackMode === 'track' && (duration > 0 || currentTrack?.duration > 0) && (
          <div className="mt-2.5">
            <div
              onClick={handleSeek}
              className="h-1.5 bg-white/10 hover:h-2 rounded-full cursor-pointer relative overflow-hidden transition-all"
              title="Click to seek"
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (currentTime / (duration || currentTrack?.duration || 1)) * 100)}%`,
                  background: activeColor
                }}
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
            <div className="flex border-b border-white/10 text-xs">
              <button
                onClick={() => setActiveTab('search')}
                className={`flex-1 py-2.5 text-center font-bold transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'search'
                    ? 'text-white border-b-2 border-[#53fc18] bg-white/5'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <Search size={13} />
                Search
              </button>
              <button
                onClick={() => setActiveTab('queue')}
                className={`flex-1 py-2.5 text-center font-bold transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'queue'
                    ? 'text-white border-b-2 border-[#53fc18] bg-white/5'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <ListMusic size={13} />
                Queue
                {searchResults.length > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10">{searchResults.length}</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('soundscapes')}
                className={`flex-1 py-2.5 text-center font-bold transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'soundscapes'
                    ? 'text-white border-b-2 border-[#53fc18] bg-white/5'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <CloudRain size={13} />
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

                {/* Search Results List with full length badges */}
                <div className="max-h-52 overflow-y-auto space-y-1 music-scrollbar pr-1">
                  {searchResults.length === 0 ? (
                    <p className="text-center text-xs text-white/40 py-6">
                      {searching ? 'Finding full-length songs…' : 'Search any song above to stream full tracks.'}
                    </p>
                  ) : (
                    searchResults.map((track) => {
                      const isCurrent = playbackMode === 'track' && currentTrack?.id === track.id
                      return (
                        <button
                          key={track.id}
                          onClick={() => handlePlayTrack(track)}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all ${
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
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold truncate ${isCurrent ? 'text-[#53fc18]' : 'text-white'}`}>
                              {track.title}
                            </p>
                            <p className="text-[10px] text-white/50 truncate">{track.artist}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/80 font-mono font-semibold">
                              {track.durationText}
                            </span>
                            {isCurrent && playing ? (
                              <div className="w-2 h-2 rounded-full bg-[#53fc18] animate-pulse" />
                            ) : (
                              <Play size={12} className="text-white/30 hover:text-white" />
                            )}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: Queue (current playlist) */}
            {activeTab === 'queue' && (() => {
              const currentIdx = searchResults.findIndex(t => t.id === currentTrack?.id)
              const upNextIdx = shuffle ? -1 : (currentIdx + 1) % searchResults.length
              return (
                <div className="p-3">
                  {/* Queue header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
                      {searchResults.length} tracks in queue
                    </span>
                    <button
                      onClick={() => setShuffle(s => !s)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold transition-colors ${
                        shuffle ? 'bg-[#53fc18]/20 text-[#53fc18] border border-[#53fc18]/30' : 'bg-white/5 text-white/50 border border-white/10'
                      }`}
                    >
                      <Shuffle size={10} />
                      {shuffle ? 'Shuffle ON' : 'Shuffle OFF'}
                    </button>
                  </div>

                  {searchResults.length === 0 ? (
                    <div className="py-8 flex flex-col items-center gap-2 text-white/30">
                      <ListMusic size={28} />
                      <p className="text-xs">Queue is empty — search songs to add</p>
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-0.5 music-scrollbar pr-1">
                      {searchResults.map((track, idx) => {
                        const isCurrent = playbackMode === 'track' && currentTrack?.id === track.id
                        const isUpNext = !shuffle && idx === upNextIdx && !isCurrent && playbackMode === 'track'
                        return (
                          <button
                            key={track.id}
                            onClick={() => handlePlayTrack(track)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-left transition-all group ${
                              isCurrent
                                ? 'bg-[#53fc18]/15 border border-[#53fc18]/40'
                                : isUpNext
                                ? 'bg-white/5 border border-white/15'
                                : 'hover:bg-white/5 border border-transparent'
                            }`}
                          >
                            {/* Track number / playing indicator */}
                            <div className="w-5 shrink-0 flex items-center justify-center">
                              {isCurrent && playing ? (
                                <span className="flex gap-px items-end h-3">
                                  {[4, 9, 6].map((h, i) => (
                                    <motion.div
                                      key={i}
                                      className="w-0.5 rounded-full bg-[#53fc18]"
                                      animate={{ height: [2, h + 2, 2] }}
                                      transition={{ duration: 0.4 + i * 0.1, repeat: Infinity }}
                                    />
                                  ))}
                                </span>
                              ) : isCurrent ? (
                                <div className="w-1.5 h-1.5 rounded-full bg-[#53fc18]" />
                              ) : (
                                <span className="text-[9px] text-white/30 font-mono group-hover:hidden">{idx + 1}</span>
                              )}
                            </div>

                            <img
                              src={track.thumbnail || track.artwork}
                              alt=""
                              className="w-8 h-8 rounded-lg object-cover shrink-0 bg-white/5"
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-semibold truncate ${
                                isCurrent ? 'text-[#53fc18]' : isUpNext ? 'text-white' : 'text-white/80'
                              }`}>
                                {track.title}
                              </p>
                              <p className="text-[9px] text-white/40 truncate">{track.artist}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isUpNext && (
                                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/60 font-semibold whitespace-nowrap">
                                  Up next
                                </span>
                              )}
                              <span className="text-[9px] text-white/30 font-mono">{track.durationText}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* TAB 2: Real Soundscapes */}
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
    </motion.div>
  )
}
