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
  Search,
  Sparkles,
  Users,
  User,
  Tv,
  EyeOff,
  Loader2,
  Disc,
  Shuffle,
  BookmarkPlus,
  Sliders,
  PlusCircle,
  Heart,
  History,
  Check,
  Activity,
  Trash2,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react'
import { api } from '../services/api'
import { useActiveCall } from '../contexts/ActiveCallContext'
import AmbientSoundMixer from './AmbientSoundMixer'
import AudioVisualizer from './AudioVisualizer'
import SaveToPlaylistModal from './SaveToPlaylistModal'

// Curated Popular Music Genres & Styles for User Preferences
export const MUSIC_GENRES = [
  { id: 'pop', name: 'Pop Hits', emoji: '🎤', desc: 'Billboard & Global Chartbusters' },
  { id: 'hiphop', name: 'Hip-Hop & Rap', emoji: '🎧', desc: 'Trending beats, Drake, Kendrick, Eminem' },
  { id: 'bollywood', name: 'Bollywood & Hindi', emoji: '🇮🇳', desc: 'Arijit, Pritam, trending melodies' },
  { id: 'punjabi', name: 'Punjabi & Desi', emoji: '🥁', desc: 'Diljit, Karan Aujla, AP Dhillon' },
  { id: 'rnb', name: 'R&B & Soul', emoji: '💜', desc: 'The Weeknd, SZA, Frank Ocean' },
  { id: 'rock', name: 'Rock & Alternative', emoji: '🎸', desc: 'Queen, Linkin Park, Coldplay, Arctic Monkeys' },
  { id: 'edm', name: 'EDM & Dance', emoji: '🪩', desc: 'Avicii, Martin Garrix, Alan Walker' },
  { id: 'kpop', name: 'K-Pop', emoji: '✨', desc: 'BTS, BLACKPINK, NewJeans, Stray Kids' },
  { id: 'indie', name: 'Indie & Folk', emoji: '🌿', desc: 'Lord Huron, Hozier, Phoebe Bridgers' },
  { id: 'gaming', name: 'Gaming & Phonk', emoji: '🎮', desc: 'Kordhell, Synthwave, high energy' },
  { id: 'anime', name: 'Anime & J-Pop', emoji: '🌸', desc: 'Yoasobi, LiSA, Radwimps, JJK' },
  { id: 'acoustic', name: 'Acoustic & Unplugged', emoji: '☕', desc: 'Ed Sheeran, John Mayer, unplugged' },
  { id: 'latin', name: 'Latin & Reggaeton', emoji: '🔥', desc: 'Bad Bunny, Rosalia, J Balvin' },
  { id: 'classical', name: 'Classical & Piano', emoji: '🎻', desc: 'Chopin, Ludovico Einaudi, Mozart' },
  { id: 'lofi', name: 'Chill Lo-Fi', emoji: '🌙', desc: 'Mellow aesthetic beats' },
]

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

  // Storage keys for preferences, liked tracks & history
  const userId = currentUser?._id || 'guest'
  const prefsKey = `studysync_music_prefs_${userId}`
  const likedKey = `studysync_liked_songs_${userId}`
  const recentKey = `studysync_recent_tracks_${userId}`

  // Restore cached global state if available
  const cached = typeof window !== 'undefined' ? window.__STUDYSYNC_MUSIC_STATE__ : null

  const [playing, setPlaying] = useState(cached ? !!cached.playing : false)
  const [activeTab, setActiveTab] = useState('discover') // 'discover' | 'jukebox' | 'playlists' | 'ambient'
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [currentTrack, setCurrentTrack] = useState(cached?.track || null)
  const [volume, setVolume] = useState(typeof window !== 'undefined' && window.__STUDYSYNC_MUSIC_VOL__ !== undefined ? window.__STUDYSYNC_MUSIC_VOL__ : 0.7)
  const [muted, setMuted] = useState(false)
  const [showVideo, setShowVideo] = useState(false)
  const [showVisualizer, setShowVisualizer] = useState(true)
  const [syncWithRoom, setSyncWithRoom] = useState(true)
  const [currentTime, setCurrentTime] = useState(cached?.currentTime || 0)
  const [duration, setDuration] = useState(cached?.duration || 0)
  const [loadingAudio, setLoadingAudio] = useState(false)
  const [shuffle, setShuffle] = useState(false)

  // Taste view inside side panel
  const [showTasteView, setShowTasteView] = useState(false)

  // User Preference & Taste Profile
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem(prefsKey) || localStorage.getItem('studysync_music_prefs')
      return saved ? JSON.parse(saved) : ['pop', 'hiphop']
    } catch {
      return ['pop', 'hiphop']
    }
  })
  const [tempPreferences, setTempPreferences] = useState(preferences)
  const [activeFilter, setActiveFilter] = useState('for-you') // 'for-you' | 'liked' | 'recent' | genreId

  // Liked Songs
  const [likedSongs, setLikedSongs] = useState(() => {
    try {
      const saved = localStorage.getItem(likedKey)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Recently Played
  const [recentTracks, setRecentTracks] = useState(() => {
    try {
      const saved = localStorage.getItem(recentKey)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

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
  const currentTimeRef = useRef(currentTime)
  currentTimeRef.current = currentTime
  const handleNextTrackRef = useRef(null)
  const isScrubbingRef = useRef(false)
  const ytContainerRef = useRef(null)
  const ytReadyRef = useRef(typeof window !== 'undefined' && !!window.__STUDYSYNC_YT_READY__)
  const searchTimeoutRef = useRef(null)
  const progressTimerRef = useRef(null)

  const socketRef2 = useRef(socket)
  useEffect(() => { socketRef2.current = socket }, [socket])

  // Jukebox real-time socket events
  useEffect(() => {
    if (!socket || !roomId) return
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

  // Watchdog: prevent loading overlay from ever getting stuck
  useEffect(() => {
    if (loadingAudio) {
      const t = setTimeout(() => setLoadingAudio(false), 4000)
      return () => clearTimeout(t)
    }
  }, [loadingAudio])

  // Ensure YouTube IFrame API script is loaded
  useEffect(() => {
    if (window.YT && window.YT.Player) return
    if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) return
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  }, [])

  // Load personalized music according to user preference
  const loadPersonalizedMusic = useCallback(async (genreList) => {
    setSearching(true)
    try {
      const genresToUse = genreList && genreList.length > 0 ? genreList : ['pop', 'hiphop']
      const res = await api.getPersonalizedMusic(genresToUse)
      if (res.tracks && res.tracks.length > 0) {
        setSearchResults(res.tracks)
      } else {
        const fallback = await api.getTrendingMusic(genresToUse[0] || 'pop')
        setSearchResults(fallback.tracks || [])
      }
    } catch (e) {
      console.warn('Personalized music fetch failed:', e.message)
    } finally {
      setSearching(false)
    }
  }, [])

  // Feed load based on filter
  useEffect(() => {
    if (!searchQuery) {
      if (activeFilter === 'for-you') {
        loadPersonalizedMusic(preferences)
      } else if (activeFilter === 'liked') {
        setSearchResults(likedSongs)
      } else if (activeFilter === 'recent') {
        setSearchResults(recentTracks)
      } else {
        setSearching(true)
        api.getTrendingMusic(activeFilter)
          .then((d) => setSearchResults(d.tracks || []))
          .catch(() => {})
          .finally(() => setSearching(false))
      }
    }
  }, [preferences, activeFilter, searchQuery, likedSongs, recentTracks, loadPersonalizedMusic])

  // Toggle Like / Favorite on any track
  const toggleLikeTrack = (track, e) => {
    if (e) e.stopPropagation()
    if (!track) return
    const trackId = track.videoId || track.id
    setLikedSongs((prev) => {
      const exists = prev.some((t) => (t.videoId || t.id) === trackId)
      const next = exists
        ? prev.filter((t) => (t.videoId || t.id) !== trackId)
        : [track, ...prev]
      try {
        localStorage.setItem(likedKey, JSON.stringify(next))
      } catch {}
      return next
    })
  }

  const isTrackLiked = (track) => {
    if (!track) return false
    const trackId = track.videoId || track.id
    return likedSongs.some((t) => (t.videoId || t.id) === trackId)
  }

  // Save Preferences
  const handleSavePreferences = (newPrefs) => {
    const valid = newPrefs && newPrefs.length > 0 ? newPrefs : ['pop']
    setPreferences(valid)
    try {
      localStorage.setItem(prefsKey, JSON.stringify(valid))
      localStorage.setItem('studysync_music_prefs', JSON.stringify(valid))
    } catch {}
    setShowTasteView(false)
    setActiveFilter('for-you')
    loadPersonalizedMusic(valid)
  }

  // Debounced search
  const handleSearchChange = (val) => {
    setSearchQuery(val)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    if (!val.trim()) {
      if (activeFilter === 'for-you') {
        loadPersonalizedMusic(preferences)
      } else if (activeFilter === 'liked') {
        setSearchResults(likedSongs)
      } else if (activeFilter === 'recent') {
        setSearchResults(recentTracks)
      } else {
        api.getTrendingMusic(activeFilter).then((d) => setSearchResults(d.tracks || [])).catch(() => {})
      }
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

  // Broadcast functions
  const broadcastPlay = useCallback((item, time = 0) => {
    if (!socket || !roomId || !syncWithRoom || !item) return
    socket.emit('music-play', { roomId, track: item, mode: 'track', currentTime: time })
  }, [socket, roomId, syncWithRoom])

  const broadcastPause = useCallback((time = 0) => {
    if (!socket || !roomId || !syncWithRoom) return
    socket.emit('music-pause', { roomId, currentTime: time })
  }, [socket, roomId, syncWithRoom])

  const broadcastSeek = useCallback((time) => {
    if (!socket || !roomId || !syncWithRoom) return
    socket.emit('music-seek', { roomId, currentTime: time })
  }, [socket, roomId, syncWithRoom])

  // Sync on mount
  useEffect(() => {
    if (socket && roomId) {
      socket.emit('music-request-sync', { roomId })
    }
  }, [socket, roomId])

  // Sync socket listeners
  useEffect(() => {
    if (!socket) return

    const onMusicSync = (data) => {
      if (!syncWithRoom || !data) return

      if (data.track) {
        setCurrentTrack(data.track)
      }
      setPlaying(!!data.playing)

      if (typeof data.currentTime === 'number') {
        const target = data.currentTime
        setCurrentTime((prev) => {
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

  // Mount/load YouTube Player
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

      const existingPlayer = window.__STUDYSYNC_YT_PLAYER__
      const iframe = existingPlayer && typeof existingPlayer.getIframe === 'function' ? existingPlayer.getIframe() : null
      const isPlayerAlive = iframe && document.contains(iframe) && typeof existingPlayer.loadVideoById === 'function'

      if (isPlayerAlive && ytReadyRef.current) {
        try {
          if (currentVideoIdRef.current !== videoId) {
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
              const seekTarget = currentTimeRef.current
              if (seekTarget > 2) {
                e.target.seekTo(seekTarget, true)
              }
              if (autoPlay) e.target.playVideo()
            } catch (err) {}
            setLoadingAudio(false)
          },
          onStateChange: (e) => {
            if (e.data === 0) {
              setPlaying(false)
              setLoadingAudio(false)
              if (handleNextTrackRef.current) handleNextTrackRef.current()
            } else if (e.data === 1) {
              setPlaying(true)
              setLoadingAudio(false)
            } else if (e.data === 2) {
              setPlaying(false)
              setLoadingAudio(false)
            } else if (e.data === 3) {
              setLoadingAudio(true)
            } else if (e.data === 5) {
              setLoadingAudio(false)
              if (autoPlay) {
                try { e.target.playVideo() } catch (_) {}
              }
            }
          },
          onError: (e) => {
            console.warn('YouTube Player error code:', e.data)
            setLoadingAudio(false)
            if (handleNextTrackRef.current) {
              handleNextTrackRef.current()
            }
          },
        },
      })
    }

    create()
  }, [])

  // Playback coordinator
  useEffect(() => {
    const audio = getGlobalRoomAudio()
    if (progressTimerRef.current) clearInterval(progressTimerRef.current)

    if (typeof window !== 'undefined') {
      window.__STUDYSYNC_MUSIC_STATE__ = {
        playing,
        track: currentTrack,
        currentTime,
        duration,
      }
    }

    if (!playing || !currentTrack) {
      if (audio) audio.pause()
      if (window.__STUDYSYNC_YT_PLAYER__ && ytReadyRef.current) {
        try { window.__STUDYSYNC_YT_PLAYER__.pauseVideo() } catch (e) {}
      }
      setLoadingAudio(false)
      return
    }

    if (currentTrack?.source === 'youtube' && currentTrack.videoId) {
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
    } else if (currentTrack?.audioUrl) {
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
    }

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    }
  }, [playing, currentTrack, mountYTPlayer])

  // Volume synchronization
  useEffect(() => {
    effectiveVolumeRef.current = effectiveVolume
    if (typeof window !== 'undefined') {
      window.__STUDYSYNC_MUSIC_VOL__ = volume
    }
    const audio = getGlobalRoomAudio()
    if (audio) {
      audio.volume = effectiveVolume
    }
    if (window.__STUDYSYNC_YT_PLAYER__ && ytReadyRef.current) {
      try {
        window.__STUDYSYNC_YT_PLAYER__.setVolume(effectiveVolume * 100)
      } catch (e) {}
    }
  }, [effectiveVolume, volume])

  // HTML5 audio event listeners
  useEffect(() => {
    const audio = getGlobalRoomAudio()
    if (!audio) return

    const onTimeUpdate = () => {
      if (currentTrack?.source !== 'youtube') {
        if (!isScrubbingRef.current) {
          setCurrentTime(audio.currentTime || 0)
        }
      }
    }
    const onLoadedMetadata = () => {
      if (currentTrack?.source !== 'youtube') {
        setDuration(audio.duration || 0)
      }
    }
    const onEnded = () => {
      if (handleNextTrackRef.current) {
        handleNextTrackRef.current()
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
  }, [currentTrack])

  // Host heartbeat
  useEffect(() => {
    if (!isHost || !syncWithRoom || !playing || !socket || !roomId) return
    const interval = setInterval(() => {
      let currentSec = currentTimeRef.current
      if (currentTrack?.source === 'youtube' && window.__STUDYSYNC_YT_PLAYER__ && ytReadyRef.current) {
        try {
          const ytSec = window.__STUDYSYNC_YT_PLAYER__.getCurrentTime()
          if (typeof ytSec === 'number' && ytSec > 0) currentSec = ytSec
        } catch (e) {}
      }
      socket.emit('music-seek', { roomId, currentTime: currentSec })
    }, 5000)
    return () => clearInterval(interval)
  }, [isHost, syncWithRoom, playing, socket, roomId, currentTrack])

  // Align YouTube player directly over container slot with frame-accurate rAF sync
  const isYouTubeActive = currentTrack?.source === 'youtube'
  useEffect(() => {
    const host = getGlobalYTHost()
    if (!host) return

    if (!document.body.contains(host)) {
      document.body.appendChild(host)
    }

    let rafId = null
    let active = true

    const syncPosition = () => {
      if (!active) return

      if (isOpen && !showTasteView && showVideo && isYouTubeActive && ytContainerRef.current) {
        const rect = ytContainerRef.current.getBoundingClientRect()
        if (rect.width > 20 && rect.height > 20 && rect.left < window.innerWidth && rect.right > 0) {
          host.style.position = 'fixed'
          host.style.top = `${Math.round(rect.top)}px`
          host.style.left = `${Math.round(rect.left)}px`
          host.style.width = `${Math.round(rect.width)}px`
          host.style.height = `${Math.round(rect.height)}px`
          host.style.opacity = '1'
          host.style.pointerEvents = 'auto'
          host.style.zIndex = '55'
          host.style.display = 'block'
          host.style.borderRadius = '0px'
          host.style.overflow = 'hidden'
        } else {
          host.style.opacity = '0.001'
          host.style.pointerEvents = 'none'
        }
      } else {
        host.style.position = 'fixed'
        host.style.top = '-9999px'
        host.style.left = '-9999px'
        host.style.opacity = '0.001'
        host.style.pointerEvents = 'none'
      }

      // Keep tracking every frame while video is active and side panel is open
      if (isOpen && !showTasteView && showVideo && isYouTubeActive) {
        rafId = requestAnimationFrame(syncPosition)
      }
    }

    syncPosition()

    window.addEventListener('resize', syncPosition)
    window.addEventListener('scroll', syncPosition, true)

    return () => {
      active = false
      if (rafId) cancelAnimationFrame(rafId)
      window.removeEventListener('resize', syncPosition)
      window.removeEventListener('scroll', syncPosition, true)
      if (host) {
        host.style.position = 'fixed'
        host.style.top = '-9999px'
        host.style.left = '-9999px'
        host.style.opacity = '0.001'
        host.style.pointerEvents = 'none'
      }
    }
  }, [isOpen, showTasteView, showVideo, isYouTubeActive])

  // Play Track & Record Recently Played
  const handlePlayTrack = (track) => {
    if (!track) return
    setCurrentTrack(track)
    setCurrentTime(0)
    setPlaying(true)
    broadcastPlay(track, 0)

    // Save to recently played
    setRecentTracks((prev) => {
      const trackId = track.videoId || track.id
      const filtered = prev.filter((t) => (t.videoId || t.id) !== trackId)
      const next = [track, ...filtered].slice(0, 30)
      try {
        localStorage.setItem(recentKey, JSON.stringify(next))
      } catch {}
      return next
    })
  }

  // Toggle Play / Pause
  const handleTogglePlay = () => {
    if (playing) {
      setPlaying(false)
      broadcastPause(currentTime)
    } else {
      if (!currentTrack && searchResults.length > 0) {
        handlePlayTrack(searchResults[0])
        return
      }
      if (currentTrack) {
        setPlaying(true)
        broadcastPlay(currentTrack, currentTime)
      }
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
    if (!s || !roomId) return
    const newMode = jukeboxState.mode === 'open' ? 'approval' : 'open'
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

  // Next Track with personalized continuity
  const handleNextTrack = () => {
    if (socket && roomId && jukeboxState?.queue && jukeboxState.queue.length > 0) {
      socket.emit('jukebox-next', { roomId })
      return
    }

    if (searchResults.length > 0) {
      if (shuffle) {
        const randomIdx = Math.floor(Math.random() * searchResults.length)
        handlePlayTrack(searchResults[randomIdx])
      } else {
        const idx = searchResults.findIndex((t) =>
          (t.id && currentTrack?.id && t.id === currentTrack.id) ||
          (t.videoId && currentTrack?.videoId && t.videoId === currentTrack.videoId) ||
          (t.audioUrl && currentTrack?.audioUrl && t.audioUrl === currentTrack.audioUrl)
        )
        if (idx >= 0 && idx < searchResults.length - 1) {
          handlePlayTrack(searchResults[idx + 1])
        } else if (idx === searchResults.length - 1) {
          const query = currentTrack?.artist || preferences[0] || 'pop'
          api.searchMusic(query, 12).then((data) => {
            if (data.tracks?.length) {
              const newTracks = data.tracks.filter((nt) =>
                !searchResults.some((st) => (st.videoId && st.videoId === nt.videoId) || (st.id && st.id === nt.id))
              )
              if (newTracks.length > 0) {
                setSearchResults((prev) => [...prev, ...newTracks])
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
      loadPersonalizedMusic(preferences)
    }
  }

  handleNextTrackRef.current = handleNextTrack

  // Previous Track
  const handlePrevTrack = () => {
    if (searchResults.length > 0) {
      if (shuffle) {
        const randomIdx = Math.floor(Math.random() * searchResults.length)
        handlePlayTrack(searchResults[randomIdx])
      } else {
        const idx = searchResults.findIndex((t) =>
          (t.id && currentTrack?.id && t.id === currentTrack.id) ||
          (t.videoId && currentTrack?.videoId && t.videoId === currentTrack.videoId) ||
          (t.audioUrl && currentTrack?.audioUrl && t.audioUrl === currentTrack.audioUrl)
        )
        const prevIdx = idx > 0 ? idx - 1 : searchResults.length - 1
        handlePlayTrack(searchResults[prevIdx])
      }
    }
  }

  // Seek bar
  const handleSeek = (targetSec) => {
    const maxDur = duration || currentTrack?.duration || 180
    const t = Math.max(0, Math.min(maxDur, targetSec))
    setCurrentTime(t)

    if (currentTrack?.source === 'youtube' && window.__STUDYSYNC_YT_PLAYER__ && ytReadyRef.current) {
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

  const displayTitle = currentTrack?.title || 'Choose a track or preference'
  const displaySubtitle = currentTrack?.artist || 'Music matching your style'
  const displayArtwork = currentTrack?.artwork || currentTrack?.thumbnail || null
  const activeColor = '#53fc18'
  const isCurrentLiked = isTrackLiked(currentTrack)

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
    <>
      {/* Dark backdrop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onToggle}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity"
      />

      {/* Side Panel Drawer */}
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="fixed top-0 right-0 z-50 h-screen w-full sm:w-[440px] bg-[#0c0f15] border-l border-[#232730] shadow-2xl flex flex-col overflow-hidden text-white"
      >
        {/* VIEW 1: Taste / Preference Customizer View (Full side panel width) */}
        {showTasteView ? (
          <div className="flex flex-col h-full bg-[#0c0f15]">
            {/* Taste Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-[#12161f] shrink-0">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setShowTasteView(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
                  title="Back to player"
                >
                  <ArrowLeft size={17} />
                </button>
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-[#53fc18]" />
                  <h3 className="text-sm font-bold text-white tracking-wide">Your Music Taste</h3>
                </div>
              </div>

              <button
                onClick={() => setTempPreferences(['pop', 'hiphop', 'bollywood', 'rock', 'rnb'])}
                className="text-[11px] text-[#53fc18] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                title="Select popular genres"
              >
                <RotateCcw size={11} /> Popular
              </button>
            </div>

            {/* Taste Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <p className="text-xs font-semibold text-white/90">Personalize Your StudySync Sound</p>
                <p className="text-[11px] text-white/50 leading-relaxed">
                  Select your favorite vibes below. Your Discover feed, autoplay, and recommendations will be tuned specifically to your taste.
                </p>
              </div>

              {/* Full Width Genres Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {MUSIC_GENRES.map((genre) => {
                  const isSelected = tempPreferences.includes(genre.id)
                  return (
                    <button
                      key={genre.id}
                      onClick={() => {
                        setTempPreferences((prev) =>
                          prev.includes(genre.id)
                            ? prev.filter((x) => x !== genre.id)
                            : [...prev, genre.id]
                        )
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl text-left border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#53fc18]/15 border-[#53fc18]/50 text-white shadow-sm'
                          : 'bg-[#141822] border-white/5 hover:border-white/15 hover:bg-white/5 text-white/70'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-1">
                        <span className="text-xl shrink-0">{genre.emoji}</span>
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-white/80'}`}>
                            {genre.name}
                          </p>
                          <p className="text-[10px] text-white/40 truncate">{genre.desc}</p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'bg-[#53fc18] text-[#0c0f15]' : 'border border-white/20'
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Taste Footer Bar */}
            <div className="p-4 border-t border-white/10 bg-[#12161f] flex items-center justify-between shrink-0">
              <span className="text-xs font-mono text-white/60">
                {tempPreferences.length} {tempPreferences.length === 1 ? 'genre' : 'genres'} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTasteView(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSavePreferences(tempPreferences)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#53fc18] text-[#0e0f13] hover:bg-[#53fc18]/90 transition-all shadow-[0_0_15px_rgba(83,252,24,0.3)] cursor-pointer"
                >
                  Save & Apply Taste
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* VIEW 2: Standard Music Player Side Panel View */
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#242831] bg-[#10141d] shrink-0">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    background: activeColor,
                    boxShadow: playing ? `0 0 10px ${activeColor}` : 'none',
                  }}
                />
                <span className="text-xs font-bold tracking-wide text-white uppercase">StudySync Music</span>
                {playing && (
                  <span className="flex gap-0.5 items-end h-3 ml-0.5">
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

              <div className="flex items-center gap-1.5">
                {/* Taste Preferences Button */}
                <button
                  onClick={() => {
                    setTempPreferences(preferences)
                    setShowTasteView(true)
                  }}
                  className="px-2.5 py-1 flex items-center gap-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors border border-white/10 cursor-pointer"
                  title="Customize your music preferences"
                >
                  <Sparkles size={13} className="text-[#53fc18]" />
                  <span>Taste</span>
                </button>

                {isYouTubeActive && (
                  <button
                    onClick={() => setShowVideo((v) => !v)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                      showVideo ? 'bg-[#53fc18]/20 text-[#53fc18]' : 'text-white/50 hover:text-white hover:bg-white/10'
                    }`}
                    title={showVideo ? 'Hide video' : 'Show video player'}
                  >
                    {showVideo ? <EyeOff size={14} /> : <Tv size={14} />}
                  </button>
                )}

                <button
                  onClick={() => setShowVisualizer((v) => !v)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                    showVisualizer ? 'bg-[#53fc18]/20 text-[#53fc18]' : 'text-white/50 hover:text-white hover:bg-white/10'
                  }`}
                  title={showVisualizer ? 'Hide Visualizer' : 'Show Spectrum Visualizer'}
                >
                  <Activity size={14} />
                </button>

                <button
                  onClick={onToggle}
                  className="w-7 h-7 flex items-center justify-center text-white/50 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors ml-1 cursor-pointer"
                  title="Close panel"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Docked YouTube Player Frame */}
            {showVideo && isYouTubeActive && (
              <div className="w-full h-52 bg-black border-b border-[#242831] relative shrink-0 overflow-hidden">
                <div ref={ytContainerRef} className="w-full h-full relative z-10 bg-black" />
                {loadingAudio && (
                  <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-xs flex items-center justify-center gap-2 text-xs text-[#53fc18] pointer-events-none">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="font-semibold">Loading track…</span>
                  </div>
                )}
              </div>
            )}

            {/* Dynamic Spectrum Audio Visualizer */}
            {showVisualizer && (
              <div className="w-full bg-[#0a0c10] border-b border-[#242831] px-4 pt-2 pb-1 shrink-0">
                <AudioVisualizer isPlaying={playing} accentColor={activeColor} />
              </div>
            )}

            {/* Now Playing Area */}
            <div className="p-4 bg-[#11151e] border-b border-[#242831] shrink-0">
              <div className="flex items-center gap-3">
                {(!showVideo || !isYouTubeActive) && (
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 overflow-hidden shadow-lg border border-white/10 relative"
                    style={{ background: '#1c2026' }}
                  >
                    {displayArtwork ? (
                      <img src={displayArtwork} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Disc size={26} style={{ color: activeColor }} className={playing ? 'animate-spin' : ''} />
                    )}
                    {loadingAudio && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                        <Loader2 size={16} className="text-white animate-spin" />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ background: `${activeColor}25`, color: activeColor }}
                    >
                      {currentTrack?.durationText ? `Full Song (${currentTrack.durationText})` : 'Full Track'}
                    </span>

                    {currentTrack && (
                      <button
                        onClick={(e) => toggleLikeTrack(currentTrack, e)}
                        className={`p-1 rounded transition-colors cursor-pointer ${
                          isCurrentLiked ? 'text-rose-400 hover:text-rose-300' : 'text-white/40 hover:text-white'
                        }`}
                        title={isCurrentLiked ? 'Remove from Liked' : 'Like this song'}
                      >
                        <Heart size={15} fill={isCurrentLiked ? 'currentColor' : 'none'} />
                      </button>
                    )}
                  </div>

                  <p className="text-xs font-bold text-white truncate mt-1 leading-snug">{displayTitle}</p>
                  <p className="text-[11px] text-white/60 truncate">{displaySubtitle}</p>
                </div>
              </div>

              {/* Scrubbable Timeline */}
              <div className="mt-3">
                <div className="relative h-5 flex items-center">
                  <div className="absolute inset-x-0 h-1.5 top-1/2 -translate-y-1/2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (currentTime / Math.max(1, duration || currentTrack?.duration || 1)) * 100)}%`,
                        background: activeColor,
                        transition: playing ? 'width 0.5s linear' : 'none',
                      }}
                    />
                  </div>
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
                <div className="flex justify-between text-[10px] text-white/40 font-mono">
                  <span>{formatSec(currentTime)}</span>
                  <span>{currentTrack?.durationText || formatSec(duration)}</span>
                </div>
              </div>

              {/* Master Controls */}
              <div className="flex items-center justify-between mt-2.5">
                <button
                  onClick={() => setMuted((m) => !m)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title={muted ? 'Unmute' : 'Mute'}
                >
                  {muted || effectiveVolume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handlePrevTrack}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Previous song"
                  >
                    <SkipBack size={17} />
                  </button>

                  <button
                    onClick={handleTogglePlay}
                    className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-transform active:scale-95 hover:scale-105 cursor-pointer"
                    style={{ background: activeColor, color: '#0e0f13' }}
                    title={playing ? 'Pause' : 'Play'}
                  >
                    {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                  </button>

                  <button
                    onClick={handleNextTrack}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Next song"
                  >
                    <SkipForward size={17} />
                  </button>
                </div>

                <button
                  onClick={() => setShuffle((s) => !s)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                    shuffle ? 'text-[#53fc18] bg-[#53fc18]/15' : 'text-white/40 hover:text-white hover:bg-white/10'
                  }`}
                  title={shuffle ? 'Shuffle: ON' : 'Shuffle: OFF'}
                >
                  <Shuffle size={14} />
                </button>
              </div>

              {/* Volume Slider */}
              <div className="mt-2.5 flex items-center gap-2 px-1">
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
              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px]">
                <span className="text-white/70 flex items-center gap-1.5 truncate">
                  {syncWithRoom ? <Users size={13} className="text-[#53fc18]" /> : <User size={13} className="text-white/40" />}
                  {isHost ? (syncWithRoom ? 'Broadcasting to Room' : 'Solo Mode') : (syncWithRoom ? 'Synced with Room' : 'Personal Study')}
                </span>
                <button
                  onClick={() => setSyncWithRoom((s) => !s)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors shrink-0 ml-1 cursor-pointer ${
                    syncWithRoom
                      ? 'bg-[#53fc18]/20 text-[#53fc18] border border-[#53fc18]/30'
                      : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
                  }`}
                >
                  {syncWithRoom ? 'Sync: ON' : 'Sync: OFF'}
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-white/10 text-xs bg-[#10141d] shrink-0">
              <button
                onClick={() => setActiveTab('discover')}
                className={`flex-1 py-2.5 px-2 text-center font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'discover'
                    ? 'text-white border-b-2 border-[#53fc18] bg-white/5'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <Sparkles size={13} className={activeTab === 'discover' ? 'text-[#53fc18]' : ''} />
                For You
              </button>
              <button
                onClick={() => setActiveTab('jukebox')}
                className={`flex-1 py-2.5 px-2 text-center font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'jukebox'
                    ? 'text-white border-b-2 border-[#53fc18] bg-white/5'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <Disc size={13} />
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
                onClick={() => setActiveTab('playlists')}
                className={`flex-1 py-2.5 px-2 text-center font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'playlists'
                    ? 'text-white border-b-2 border-[#53fc18] bg-white/5'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <BookmarkPlus size={13} />
                Playlists
              </button>
              <button
                onClick={() => setActiveTab('ambient')}
                className={`flex-1 py-2.5 px-2 text-center font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'ambient'
                    ? 'text-white border-b-2 border-[#53fc18] bg-white/5'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <Sliders size={13} />
                Mixer
              </button>
            </div>

            {/* TAB CONTENT (Fills remaining height) */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {/* TAB 1: Discover / For You */}
              {activeTab === 'discover' && (
                <div className="space-y-3">
                  {/* Search Input */}
                  <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Search full song, artist, album..."
                      className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-[#141822] border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#53fc18] transition-colors"
                    />
                    {searching ? (
                      <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#53fc18] animate-spin" />
                    ) : searchQuery ? (
                      <button
                        onClick={() => handleSearchChange('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    ) : null}
                  </div>

                  {/* Filter Chips */}
                  {!searchQuery && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 music-scrollbar">
                      <button
                        onClick={() => setActiveFilter('for-you')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                          activeFilter === 'for-you'
                            ? 'bg-[#53fc18] text-[#0d0f14] shadow-sm'
                            : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10'
                        }`}
                      >
                        <Sparkles size={11} />
                        For You
                      </button>

                      <button
                        onClick={() => setActiveFilter('liked')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                          activeFilter === 'liked'
                            ? 'bg-rose-500 text-white shadow-sm'
                            : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10'
                        }`}
                      >
                        <Heart size={11} fill={activeFilter === 'liked' ? 'currentColor' : 'none'} />
                        Liked ({likedSongs.length})
                      </button>

                      {recentTracks.length > 0 && (
                        <button
                          onClick={() => setActiveFilter('recent')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                            activeFilter === 'recent'
                              ? 'bg-white/25 text-white'
                              : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10'
                          }`}
                        >
                          <History size={11} />
                          Recent
                        </button>
                      )}

                      {preferences.map((pId) => {
                        const g = MUSIC_GENRES.find((x) => x.id === pId)
                        if (!g) return null
                        const isSel = activeFilter === g.id
                        return (
                          <button
                            key={g.id}
                            onClick={() => setActiveFilter(g.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                              isSel
                                ? 'bg-white/25 text-white border border-white/30'
                                : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10'
                            }`}
                          >
                            <span>{g.emoji}</span>
                            <span>{g.name}</span>
                          </button>
                        )
                      })}

                      <button
                        onClick={() => {
                          setTempPreferences(preferences)
                          setShowTasteView(true)
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap text-[#53fc18] hover:bg-[#53fc18]/10 transition-colors border border-dashed border-[#53fc18]/30 cursor-pointer flex items-center gap-1"
                        title="Customize your taste preferences"
                      >
                        <Sparkles size={11} />
                        <span>Edit Taste</span>
                      </button>
                    </div>
                  )}

                  {/* Track List */}
                  <div className="space-y-1 pr-1">
                    {searchResults.length === 0 ? (
                      <div className="text-center py-12 space-y-2">
                        <p className="text-xs text-white/50 font-medium">
                          {searching
                            ? 'Fetching personalized tracks…'
                            : activeFilter === 'liked'
                            ? 'No liked songs yet. Tap the heart on any track to save it here!'
                            : activeFilter === 'recent'
                            ? 'No recently played songs yet.'
                            : 'Search any song above to stream full tracks.'}
                        </p>
                        {!searching && (
                          <button
                            onClick={() => loadPersonalizedMusic(preferences)}
                            className="text-xs text-[#53fc18] font-semibold hover:underline cursor-pointer"
                          >
                            Refresh Recommendations
                          </button>
                        )}
                      </div>
                    ) : (
                      searchResults.map((track) => {
                        const isCurrent =
                          (currentTrack?.id && track.id && currentTrack.id === track.id) ||
                          (currentTrack?.videoId && track.videoId && currentTrack.videoId === track.videoId) ||
                          (currentTrack?.audioUrl && track.audioUrl && currentTrack.audioUrl === track.audioUrl)

                        const isLiked = isTrackLiked(track)

                        return (
                          <div
                            key={track.id || track.videoId || track.audioUrl}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
                              isCurrent
                                ? 'bg-[#53fc18]/15 border border-[#53fc18]/40'
                                : 'hover:bg-white/5 border border-transparent'
                            }`}
                          >
                            <img
                              src={track.thumbnail || track.artwork}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover shrink-0 bg-white/5 border border-white/5"
                            />
                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handlePlayTrack(track)}>
                              <p className={`text-xs font-bold truncate ${isCurrent ? 'text-[#53fc18]' : 'text-white'}`}>
                                {track.title}
                              </p>
                              <p className="text-[11px] text-white/50 truncate">{track.artist}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={(e) => toggleLikeTrack(track, e)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isLiked ? 'text-rose-400 hover:text-rose-300' : 'text-white/30 hover:text-white'
                                }`}
                                title={isLiked ? 'Unlike song' : 'Like song'}
                              >
                                <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
                              </button>

                              {roomId && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleAddToJukebox(track)
                                  }}
                                  className="p-1.5 rounded-lg text-white/40 hover:text-[#53fc18] hover:bg-white/10 transition-colors cursor-pointer"
                                  title="Request in room Jukebox"
                                >
                                  <PlusCircle size={14} />
                                </button>
                              )}

                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSaveModalTrack(track)
                                }}
                                className="p-1.5 rounded-lg text-white/40 hover:text-[#53fc18] hover:bg-white/10 transition-colors cursor-pointer"
                                title="Save to custom playlist"
                              >
                                <BookmarkPlus size={14} />
                              </button>

                              {track.durationText && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/80 font-mono font-semibold">
                                  {track.durationText}
                                </span>
                              )}

                              <button
                                onClick={() => handlePlayTrack(track)}
                                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 cursor-pointer"
                                title="Play song now"
                              >
                                {isCurrent && playing ? (
                                  <div className="w-2.5 h-2.5 rounded-full bg-[#53fc18] animate-pulse" />
                                ) : (
                                  <Play size={13} className="text-white/60 hover:text-white" />
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

              {/* TAB 2: Jukebox Queue */}
              {activeTab === 'jukebox' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setJukeboxView('queue')}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          jukeboxView === 'queue' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'
                        }`}
                      >
                        Queue ({jukeboxState.queue?.length || 0})
                      </button>
                      {isHost && (
                        <button
                          onClick={() => setJukeboxView('pending')}
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                            jukeboxView === 'pending' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'
                          }`}
                        >
                          Approval ({jukeboxState.pending?.length || 0})
                          {jukeboxState.pending?.length > 0 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          )}
                        </button>
                      )}
                    </div>

                    {isHost && (
                      <button
                        onClick={handleToggleJukeboxMode}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                          jukeboxState.mode === 'approval'
                            ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                            : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
                        }`}
                      >
                        <span>Mode: {jukeboxState.mode === 'approval' ? 'Approval Req' : 'Open Queue'}</span>
                      </button>
                    )}
                  </div>

                  {jukeboxView === 'queue' && (
                    <div className="space-y-1 pr-1">
                      {jukeboxState.queue?.length === 0 ? (
                        <p className="text-center text-xs text-white/40 py-12">
                          Queue is empty. Use the '+' button in Discover to request songs!
                        </p>
                      ) : (
                        jukeboxState.queue?.map((item, idx) => (
                          <div
                            key={item.queueId || idx}
                            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                          >
                            <span className="text-xs font-mono text-white/30 w-4 text-center shrink-0">
                              {idx + 1}
                            </span>
                            <img
                              src={item.track?.thumbnail || item.track?.artwork}
                              alt=""
                              className="w-9 h-9 rounded-lg object-cover shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-white truncate">{item.track?.title}</p>
                              <p className="text-[10px] text-white/40 truncate">
                                Req by {item.requestedByName || 'User'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleVoteJukebox(item.queueId, 1)}
                                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/70 hover:text-white transition-colors cursor-pointer"
                              >
                                ▲ {item.votes || 0}
                              </button>
                              {isHost && (
                                <button
                                  onClick={() => handleRemoveJukebox(item.queueId, false)}
                                  className="p-1.5 text-white/40 hover:text-red-400 transition-colors cursor-pointer"
                                  title="Remove from queue"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {jukeboxView === 'pending' && isHost && (
                    <div className="space-y-1 pr-1">
                      {jukeboxState.pending?.length === 0 ? (
                        <p className="text-center text-xs text-white/40 py-12">No songs waiting for host approval.</p>
                      ) : (
                        jukeboxState.pending?.map((item, idx) => (
                          <div
                            key={item.queueId || idx}
                            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20"
                          >
                            <img
                              src={item.track?.thumbnail || item.track?.artwork}
                              alt=""
                              className="w-9 h-9 rounded-lg object-cover shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-white truncate">{item.track?.title}</p>
                              <p className="text-[10px] text-amber-300/60 truncate">
                                Requested by {item.requestedByName || 'User'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleApproveJukebox(item.queueId)}
                                className="px-2.5 py-1 rounded-lg bg-[#53fc18] text-[#0e0f13] text-xs font-bold hover:bg-[#53fc18]/90 transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRemoveJukebox(item.queueId, true)}
                                className="p-1.5 text-white/40 hover:text-red-400 transition-colors cursor-pointer"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Custom Playlists */}
              {activeTab === 'playlists' && (
                <div>
                  {selectedPlaylist ? (
                    <div>
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                        <button
                          onClick={() => setSelectedPlaylist(null)}
                          className="text-xs font-semibold text-white/60 hover:text-white flex items-center gap-1.5 cursor-pointer"
                        >
                          <ArrowLeft size={13} /> Back to Playlists
                        </button>
                        <button
                          onClick={() => handlePlayPlaylist(selectedPlaylist)}
                          className="px-3 py-1 rounded-lg bg-[#53fc18] text-[#0e0f13] text-xs font-bold flex items-center gap-1.5 hover:bg-[#53fc18]/90 transition-colors cursor-pointer"
                        >
                          <Play size={11} fill="currentColor" /> Play All
                        </button>
                      </div>

                      <p className="text-sm font-bold text-white mb-2.5">{selectedPlaylist.name}</p>

                      <div className="space-y-1 pr-1">
                        {!selectedPlaylist.tracks || selectedPlaylist.tracks.length === 0 ? (
                          <p className="text-center text-xs text-white/40 py-12">This playlist is empty.</p>
                        ) : (
                          selectedPlaylist.tracks.map((track, idx) => (
                            <div
                              key={track.videoId || track.id || idx}
                              className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/5 group transition-colors"
                            >
                              <img
                                src={track.thumbnail || track.artwork}
                                alt=""
                                className="w-8 h-8 rounded-lg object-cover shrink-0"
                              />
                              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handlePlayTrack(track)}>
                                <p className="text-xs text-white truncate font-medium">{track.title}</p>
                                <p className="text-[10px] text-white/40 truncate">{track.artist}</p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => handlePlayTrack(track)}
                                  className="p-1.5 text-white/40 hover:text-white cursor-pointer"
                                >
                                  <Play size={12} fill="currentColor" />
                                </button>
                                <button
                                  onClick={(e) => handleRemoveFromPlaylist(selectedPlaylist._id, track.id || track.videoId, e)}
                                  className="p-1.5 text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  title="Remove track"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[11px] text-white/40 uppercase tracking-wider font-bold">
                          My Saved Playlists ({playlists.length})
                        </p>
                      </div>

                      <div className="space-y-2 pr-1">
                        {loadingPlaylists ? (
                          <div className="flex items-center justify-center py-12 text-white/40 gap-2">
                            <Loader2 size={16} className="animate-spin text-[#53fc18]" />
                            <span className="text-xs">Loading playlists…</span>
                          </div>
                        ) : playlists.length === 0 ? (
                          <div className="text-center py-12">
                            <p className="text-xs text-white/40 mb-1">No custom playlists created yet.</p>
                            <p className="text-[11px] text-white/30">Click the bookmark icon on any song in Discover to create one!</p>
                          </div>
                        ) : (
                          playlists.map((pl) => (
                            <div
                              key={pl._id}
                              onClick={() => setSelectedPlaylist(pl)}
                              className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-[#53fc18]/10 text-[#53fc18] flex items-center justify-center shrink-0">
                                  <BookmarkPlus size={16} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-white truncate">{pl.name}</p>
                                  <p className="text-[11px] text-white/40">{pl.tracks?.length || 0} tracks</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handlePlayPlaylist(pl)}
                                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white cursor-pointer"
                                  title="Play playlist"
                                >
                                  <Play size={13} fill="currentColor" />
                                </button>
                                <button
                                  onClick={(e) => handleDeletePlaylist(pl._id, e)}
                                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-red-400 cursor-pointer"
                                  title="Delete playlist"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: Ambient Mixer */}
              {activeTab === 'ambient' && (
                <div>
                  <AmbientSoundMixer isParentPlaying={playing} />
                </div>
              )}
            </div>
          </div>
        )}
      </motion.aside>

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
    </>
  )
}
