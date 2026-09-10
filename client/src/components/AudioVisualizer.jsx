import React, { useEffect, useRef, useState } from 'react'
import { Activity, BarChart2, Radio, Sparkles } from 'lucide-react'

export default function AudioVisualizer({ isPlaying = false, accentColor = '#53fc18' }) {
  const canvasRef = useRef(null)
  const animFrameRef = useRef(null)
  const [visualMode, setVisualMode] = useState('bars') // 'bars' | 'wave' | 'particles'

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let phase = 0
    const numBars = 36
    const barHeights = new Array(numBars).fill(4)
    const targetHeights = new Array(numBars).fill(4)

    // Particle setup
    const numParticles = 40
    const particles = Array.from({ length: numParticles }, () => ({
      x: Math.random() * (canvas.width || 380),
      y: Math.random() * (canvas.height || 100),
      radius: 1 + Math.random() * 2,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      alpha: 0.2 + Math.random() * 0.7,
    }))

    const render = () => {
      const width = canvas.width
      const height = canvas.height
      ctx.clearRect(0, 0, width, height)

      if (isPlaying) {
        phase += 0.08
        // Update bar targets with lively organic rhythm
        for (let i = 0; i < numBars; i++) {
          if (Math.random() > 0.4) {
            const harmonic = Math.sin(phase * 1.5 + i * 0.3) * 0.5 + 0.5
            const pulse = Math.cos(phase * 0.8 + i * 0.2) * 0.5 + 0.5
            targetHeights[i] = 6 + (harmonic * pulse) * (height * 0.75)
          }
          barHeights[i] += (targetHeights[i] - barHeights[i]) * 0.22
        }
      } else {
        // Idle gentle breathing
        phase += 0.02
        for (let i = 0; i < numBars; i++) {
          targetHeights[i] = 3 + Math.sin(phase + i * 0.2) * 2
          barHeights[i] += (targetHeights[i] - barHeights[i]) * 0.1
        }
      }

      if (visualMode === 'bars') {
        // ── Equalizer Spectrum Bars ─────────────────────────────────────────
        const barWidth = (width / numBars) - 2.5
        for (let i = 0; i < numBars; i++) {
          const x = i * (barWidth + 2.5) + 2
          const h = barHeights[i]
          const y = height - h

          // Gradient bar
          const grad = ctx.createLinearGradient(0, y, 0, height)
          grad.addColorStop(0, accentColor)
          grad.addColorStop(1, `${accentColor}10`)

          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.roundRect(x, y, barWidth, h, [3, 3, 0, 0])
          ctx.fill()

          // Subtle cap dot
          ctx.fillStyle = accentColor
          ctx.beginPath()
          ctx.arc(x + barWidth / 2, Math.max(2, y - 2), 1.2, 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (visualMode === 'wave') {
        // ── Smooth Sine Waveform ─────────────────────────────────────────────
        ctx.beginPath()
        ctx.moveTo(0, height / 2)

        for (let x = 0; x <= width; x += 4) {
          const normX = x / width
          const amp = isPlaying ? height * 0.38 : height * 0.08
          const y =
            height / 2 +
            Math.sin(normX * 8 + phase) * amp * Math.sin(normX * Math.PI) +
            Math.cos(normX * 14 - phase * 1.2) * (amp * 0.4)
          ctx.lineTo(x, y)
        }

        ctx.strokeStyle = accentColor
        ctx.lineWidth = 2.5
        ctx.shadowColor = accentColor
        ctx.shadowBlur = 10
        ctx.stroke()
        ctx.shadowBlur = 0

        // Soft mirror reflection
        ctx.lineTo(width, height)
        ctx.lineTo(0, height)
        ctx.closePath()
        const waveGrad = ctx.createLinearGradient(0, height / 2, 0, height)
        waveGrad.addColorStop(0, `${accentColor}30`)
        waveGrad.addColorStop(1, `${accentColor}00`)
        ctx.fillStyle = waveGrad
        ctx.fill()
      } else if (visualMode === 'particles') {
        // ── Particle Orbit / Starfield ───────────────────────────────────────
        particles.forEach((p) => {
          if (isPlaying) {
            p.x += p.vx * 2.2
            p.y += p.vy * 2.2
          } else {
            p.x += p.vx * 0.5
            p.y += p.vy * 0.5
          }

          if (p.x < 0) p.x = width
          if (p.x > width) p.x = 0
          if (p.y < 0) p.y = height
          if (p.y > height) p.y = 0

          ctx.beginPath()
          ctx.arc(p.x, p.y, isPlaying ? p.radius * 1.4 : p.radius, 0, Math.PI * 2)
          ctx.fillStyle = accentColor
          ctx.globalAlpha = p.alpha * (isPlaying ? 0.9 : 0.4)
          ctx.shadowColor = accentColor
          ctx.shadowBlur = isPlaying ? 6 : 2
          ctx.fill()
          ctx.shadowBlur = 0
          ctx.globalAlpha = 1
        })
      }

      animFrameRef.current = requestAnimationFrame(render)
    }

    // Set canvas internal resolution
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * (window.devicePixelRatio || 1)
      canvas.height = rect.height * (window.devicePixelRatio || 1)
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1)
    }

    resizeCanvas()
    animFrameRef.current = requestAnimationFrame(render)
    window.addEventListener('resize', resizeCanvas)

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [isPlaying, visualMode, accentColor])

  return (
    <div className="relative w-full h-full overflow-hidden bg-black/40 rounded-xl flex flex-col justify-between p-2">
      {/* Visual Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Mode Switcher Pill */}
      <div className="relative z-10 flex items-center justify-between pointer-events-auto">
        <span className="text-[9px] font-bold uppercase tracking-wider text-white/50 flex items-center gap-1">
          <Radio size={10} style={{ color: accentColor }} className={isPlaying ? 'animate-pulse' : ''} />
          {visualMode === 'bars' ? 'Spectrum' : visualMode === 'wave' ? 'Waveform' : 'Particles'}
        </span>

        <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md p-0.5 rounded-lg border border-white/10">
          <button
            onClick={() => setVisualMode('bars')}
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors ${
              visualMode === 'bars' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'
            }`}
            title="Spectrum Equalizer"
          >
            <BarChart2 size={11} />
          </button>
          <button
            onClick={() => setVisualMode('wave')}
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors ${
              visualMode === 'wave' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'
            }`}
            title="Neon Sine Wave"
          >
            <Activity size={11} />
          </button>
          <button
            onClick={() => setVisualMode('particles')}
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors ${
              visualMode === 'particles' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'
            }`}
            title="Reactive Particles"
          >
            <Sparkles size={11} />
          </button>
        </div>
      </div>

      <div />
    </div>
  )
}
