import React, { useState, useEffect, useRef } from 'react'
import {
  CloudRain,
  Flame,
  Coffee,
  Trees,
  Waves,
  Keyboard,
  Volume2,
  VolumeX,
  Sparkles,
  RotateCcw,
  Sliders,
} from 'lucide-react'

// Procedural Web Audio Ambient Engine
class ProceduralAmbientEngine {
  constructor() {
    this.ctx = null
    this.channels = {}
    this.masterGain = null
    this.isRunning = false
  }

  init() {
    if (this.ctx) return
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    this.ctx = new AudioContext()
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime)
    this.masterGain.connect(this.ctx.destination)
    this.isRunning = true
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  // Pink/White noise generator buffer
  createNoiseBuffer(type = 'pink', duration = 4) {
    if (!this.ctx) return null
    const bufferSize = this.ctx.sampleRate * duration
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      if (type === 'white') {
        data[i] = white * 0.1
      } else if (type === 'pink') {
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.96900 * b2 + white * 0.1538520
        b3 = 0.86650 * b3 + white * 0.3104856
        b4 = 0.55000 * b4 + white * 0.5329522
        b5 = -0.7616 * b5 - white * 0.0168980
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04
        b6 = white * 0.115926
      } else if (type === 'brown') {
        b0 = (b0 + (0.02 * white)) / 1.02
        data[i] = b0 * 0.25
      }
    }
    return buffer
  }

  startChannel(name, volume = 0.5) {
    this.init()
    this.resume()
    if (this.channels[name]) {
      this.setChannelVolume(name, volume)
      return
    }

    const gainNode = this.ctx.createGain()
    gainNode.gain.setValueAtTime(volume, this.ctx.currentTime)
    gainNode.connect(this.masterGain)

    const channelObj = { gainNode, nodes: [], intervalId: null }

    if (name === 'rain') {
      // Pink noise + bandpass filter + random drops
      const buffer = this.createNoiseBuffer('pink', 5)
      const noise = this.ctx.createBufferSource()
      noise.buffer = buffer
      noise.loop = true

      const filter = this.ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(1200, this.ctx.currentTime)

      noise.connect(filter)
      filter.connect(gainNode)
      noise.start()
      channelObj.nodes.push(noise, filter)
    } else if (name === 'fire') {
      // Low rumble + randomized crackle impulses
      const buffer = this.createNoiseBuffer('brown', 5)
      const rumble = this.ctx.createBufferSource()
      rumble.buffer = buffer
      rumble.loop = true

      const filter = this.ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(400, this.ctx.currentTime)

      rumble.connect(filter)
      filter.connect(gainNode)
      rumble.start()
      channelObj.nodes.push(rumble, filter)

      // Random pops and crackles
      channelObj.intervalId = setInterval(() => {
        if (!this.ctx || !channelObj.gainNode) return
        if (Math.random() > 0.4) {
          const osc = this.ctx.createOscillator()
          const popGain = this.ctx.createGain()
          osc.type = 'square'
          osc.frequency.setValueAtTime(150 + Math.random() * 800, this.ctx.currentTime)
          popGain.gain.setValueAtTime(0.04 * volume, this.ctx.currentTime)
          popGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.04)
          osc.connect(popGain)
          popGain.connect(this.masterGain)
          osc.start()
          osc.stop(this.ctx.currentTime + 0.05)
        }
      }, 180)
    } else if (name === 'coffee') {
      // Warm room tone murmur: filtered noise + subtle low harmonic buzz
      const buffer = this.createNoiseBuffer('pink', 6)
      const src = this.ctx.createBufferSource()
      src.buffer = buffer
      src.loop = true

      const band = this.ctx.createBiquadFilter()
      band.type = 'bandpass'
      band.frequency.setValueAtTime(500, this.ctx.currentTime)
      band.Q.setValueAtTime(1.5, this.ctx.currentTime)

      src.connect(band)
      band.connect(gainNode)
      src.start()
      channelObj.nodes.push(src, band)
    } else if (name === 'forest') {
      // Gentle wind hiss + randomized soft bird chimes
      const buffer = this.createNoiseBuffer('pink', 6)
      const breeze = this.ctx.createBufferSource()
      breeze.buffer = buffer
      breeze.loop = true

      const filter = this.ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(800, this.ctx.currentTime)

      breeze.connect(filter)
      filter.connect(gainNode)
      breeze.start()
      channelObj.nodes.push(breeze, filter)

      // Occasional sweet bird notes
      channelObj.intervalId = setInterval(() => {
        if (!this.ctx || !channelObj.gainNode) return
        if (Math.random() > 0.65) {
          const freq = 1800 + Math.random() * 1200
          const osc = this.ctx.createOscillator()
          const noteGain = this.ctx.createGain()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime)
          osc.frequency.exponentialRampToValueAtTime(freq + (Math.random() * 300 - 150), this.ctx.currentTime + 0.12)
          noteGain.gain.setValueAtTime(0.03 * volume, this.ctx.currentTime)
          noteGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.18)
          osc.connect(noteGain)
          noteGain.connect(this.masterGain)
          osc.start()
          osc.stop(this.ctx.currentTime + 0.2)
        }
      }, 1200)
    } else if (name === 'waves') {
      // Ocean wave swell using modulated noise with LFO
      const buffer = this.createNoiseBuffer('pink', 8)
      const noise = this.ctx.createBufferSource()
      noise.buffer = buffer
      noise.loop = true

      const filter = this.ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(350, this.ctx.currentTime)

      // LFO for wave ebb and flow
      const lfo = this.ctx.createOscillator()
      const lfoGain = this.ctx.createGain()
      lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime) // ~8-second swells
      lfoGain.gain.setValueAtTime(300, this.ctx.currentTime)
      lfo.connect(filter.frequency)
      lfo.start()

      noise.connect(filter)
      filter.connect(gainNode)
      noise.start()
      channelObj.nodes.push(noise, filter, lfo, lfoGain)
    } else if (name === 'keyboard') {
      // Mechanical typing clicks
      channelObj.intervalId = setInterval(() => {
        if (!this.ctx || !channelObj.gainNode) return
        if (Math.random() > 0.25) {
          const osc = this.ctx.createOscillator()
          const clickGain = this.ctx.createGain()
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(320 + Math.random() * 450, this.ctx.currentTime)
          clickGain.gain.setValueAtTime(0.06 * volume, this.ctx.currentTime)
          clickGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.03)
          osc.connect(clickGain)
          clickGain.connect(gainNode)
          osc.start()
          osc.stop(this.ctx.currentTime + 0.04)
        }
      }, 160)
    }

    this.channels[name] = channelObj
  }

  setChannelVolume(name, volume) {
    if (this.channels[name] && this.channels[name].gainNode && this.ctx) {
      this.channels[name].gainNode.gain.setValueAtTime(volume, this.ctx.currentTime)
    }
  }

  stopChannel(name) {
    const ch = this.channels[name]
    if (!ch) return
    if (ch.intervalId) clearInterval(ch.intervalId)
    if (ch.nodes) {
      ch.nodes.forEach((node) => {
        try {
          if (node.stop) node.stop()
          if (node.disconnect) node.disconnect()
        } catch (_) {}
      })
    }
    if (ch.gainNode) {
      try { ch.gainNode.disconnect() } catch (_) {}
    }
    delete this.channels[name]
  }

  stopAll() {
    Object.keys(this.channels).forEach((key) => this.stopChannel(key))
  }
}

// Global persistent instance on window
const getAmbientEngine = () => {
  if (typeof window === 'undefined') return null
  if (!window.__STUDYSYNC_AMBIENT_ENGINE__) {
    window.__STUDYSYNC_AMBIENT_ENGINE__ = new ProceduralAmbientEngine()
  }
  return window.__STUDYSYNC_AMBIENT_ENGINE__
}

const AMBIENT_SOUNDS = [
  { id: 'rain', name: 'Rain & Thunder', icon: CloudRain, color: '#38bdf8', defaultVol: 0.6 },
  { id: 'fire', name: 'Cozy Fireplace', icon: Flame, color: '#fb923c', defaultVol: 0.5 },
  { id: 'coffee', name: 'Coffee Shop', icon: Coffee, color: '#eab308', defaultVol: 0.4 },
  { id: 'forest', name: 'Forest Birds', icon: Trees, color: '#4ade80', defaultVol: 0.5 },
  { id: 'waves', name: 'Ocean Waves', icon: Waves, color: '#2dd4bf', defaultVol: 0.6 },
  { id: 'keyboard', name: 'Mechanical Keys', icon: Keyboard, color: '#a78bfa', defaultVol: 0.35 },
]

const PRESETS = [
  {
    name: 'Rainy Cafe',
    description: 'Gentle rain outside a cozy cafe',
    icon: '🌧️',
    volumes: { rain: 0.6, coffee: 0.4, fire: 0 },
  },
  {
    name: 'Cabin Study',
    description: 'Fireplace warmth with night rain',
    icon: '🔥',
    volumes: { fire: 0.65, rain: 0.45, keyboard: 0.25 },
  },
  {
    name: 'Deep Sea Focus',
    description: 'Gentle tides and ambient flow',
    icon: '🌊',
    volumes: { waves: 0.7, forest: 0.2 },
  },
  {
    name: 'Forest Retreat',
    description: 'Birds chirping in morning pine trees',
    icon: '🌲',
    volumes: { forest: 0.75, rain: 0.3 },
  },
]

export default function AmbientSoundMixer() {
  const engineRef = useRef(null)
  const [activeLayers, setActiveLayers] = useState(() => {
    if (typeof window !== 'undefined' && window.__STUDYSYNC_AMBIENT_STATE__) {
      return window.__STUDYSYNC_AMBIENT_STATE__
    }
    return {
      rain: { active: false, volume: 0.6 },
      fire: { active: false, volume: 0.5 },
      coffee: { active: false, volume: 0.4 },
      forest: { active: false, volume: 0.5 },
      waves: { active: false, volume: 0.6 },
      keyboard: { active: false, volume: 0.35 },
    }
  })

  useEffect(() => {
    engineRef.current = getAmbientEngine()
  }, [])

  // Sync state with global engine
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__STUDYSYNC_AMBIENT_STATE__ = activeLayers
    }
  }, [activeLayers])

  const toggleLayer = (id, defaultVol) => {
    const engine = engineRef.current || getAmbientEngine()
    setActiveLayers((prev) => {
      const isCurrentlyActive = !!prev[id]?.active
      const nextActive = !isCurrentlyActive
      const vol = prev[id]?.volume || defaultVol

      if (engine) {
        if (nextActive) {
          engine.startChannel(id, vol)
        } else {
          engine.stopChannel(id)
        }
      }

      return {
        ...prev,
        [id]: {
          active: nextActive,
          volume: vol,
        },
      }
    })
  }

  const handleVolumeChange = (id, vol) => {
    const engine = engineRef.current || getAmbientEngine()
    if (engine && activeLayers[id]?.active) {
      engine.setChannelVolume(id, vol)
    }
    setActiveLayers((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        volume: vol,
      },
    }))
  }

  const applyPreset = (preset) => {
    const engine = engineRef.current || getAmbientEngine()
    const nextState = {}

    AMBIENT_SOUNDS.forEach((sound) => {
      const targetVol = preset.volumes[sound.id]
      if (targetVol && targetVol > 0) {
        nextState[sound.id] = { active: true, volume: targetVol }
        if (engine) engine.startChannel(sound.id, targetVol)
      } else {
        nextState[sound.id] = { active: false, volume: sound.defaultVol }
        if (engine) engine.stopChannel(sound.id)
      }
    })

    setActiveLayers(nextState)
  }

  const resetAll = () => {
    const engine = engineRef.current || getAmbientEngine()
    if (engine) engine.stopAll()
    const resetState = {}
    AMBIENT_SOUNDS.forEach((s) => {
      resetState[s.id] = { active: false, volume: s.defaultVol }
    })
    setActiveLayers(resetState)
  }

  const activeCount = Object.values(activeLayers).filter((l) => l?.active).length

  return (
    <div className="p-3 space-y-3.5 custom-scrollbar text-white">
      {/* Header with Preset Quick Toggles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sliders size={13} className="text-[#53fc18]" />
          <span className="text-xs font-bold uppercase tracking-wider text-white/90">
            Multi-Layer Soundscapes
          </span>
          {activeCount > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#53fc18]/20 text-[#53fc18] font-bold">
              {activeCount} active
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={resetAll}
            className="flex items-center gap-1 text-[10px] text-white/40 hover:text-red-400 transition-colors"
            title="Mute all ambient sounds"
          >
            <RotateCcw size={11} />
            Reset
          </button>
        )}
      </div>

      {/* Quick Presets Carousel / Badges */}
      <div>
        <div className="text-[10px] font-semibold text-white/40 mb-1.5 flex items-center gap-1">
          <Sparkles size={11} className="text-yellow-400" />
          Environment Presets
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition-all text-left group"
            >
              <span className="text-base">{preset.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-white/90 truncate group-hover:text-[#53fc18] transition-colors">
                  {preset.name}
                </p>
                <p className="text-[9px] text-white/40 truncate">{preset.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sound Channels Grid */}
      <div className="space-y-2">
        <div className="text-[10px] font-semibold text-white/40 flex items-center justify-between">
          <span>Individual Sound Layers</span>
          <span className="text-[9px] text-white/30">Layers play alongside songs</span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {AMBIENT_SOUNDS.map((sound) => {
            const layer = activeLayers[sound.id] || { active: false, volume: sound.defaultVol }
            const Icon = sound.icon
            const isActive = !!layer.active

            return (
              <div
                key={sound.id}
                className={`p-2.5 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-white/8 border-white/20 shadow-lg'
                    : 'bg-[#14171e] border-white/5 opacity-70 hover:opacity-100 hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Left Toggle Button */}
                  <button
                    onClick={() => toggleLayer(sound.id, sound.defaultVol)}
                    className="flex items-center gap-2.5 flex-1 text-left min-w-0"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform active:scale-95"
                      style={{
                        background: isActive ? `${sound.color}25` : 'rgba(255,255,255,0.05)',
                        color: isActive ? sound.color : 'rgba(255,255,255,0.4)',
                        border: `1px solid ${isActive ? `${sound.color}50` : 'transparent'}`,
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-white/60'}`}>
                        {sound.name}
                      </p>
                      <p className="text-[10px] font-mono text-white/40">
                        {isActive ? `${Math.round(layer.volume * 100)}% volume` : 'Off'}
                      </p>
                    </div>
                  </button>

                  {/* Volume Slider */}
                  {isActive && (
                    <div className="flex items-center gap-2 w-32 shrink-0">
                      <button
                        onClick={() => handleVolumeChange(sound.id, layer.volume > 0 ? 0 : sound.defaultVol)}
                        className="text-white/40 hover:text-white transition-colors shrink-0"
                      >
                        {layer.volume === 0 ? <VolumeX size={13} /> : <Volume2 size={13} />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.02"
                        value={layer.volume}
                        onChange={(e) => handleVolumeChange(sound.id, parseFloat(e.target.value))}
                        className="flex-1 h-1 rounded-full appearance-none cursor-pointer bg-white/20"
                        style={{ accentColor: sound.color }}
                      />
                    </div>
                  )}

                  {/* On/Off Switch Pill */}
                  <button
                    onClick={() => toggleLayer(sound.id, sound.defaultVol)}
                    className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 shrink-0 ${
                      isActive ? 'bg-[#53fc18]' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-[#0c0e12] shadow-sm transform transition-transform ${
                        isActive ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
