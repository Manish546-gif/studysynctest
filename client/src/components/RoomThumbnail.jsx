import { useEffect, useRef } from 'react'

const COLORS = ['#e8eaed', '#ff4f4f', '#ff9f43', '#ffd32a', '#53fc18', '#3d8bff', '#a78bfa', '#f472b6']
const BG = '#0e0f13'

function drawMini(canvas, actions = []) {
  if (!canvas || !actions.length) return
  const ctx = canvas.getContext('2d')
  const W = canvas.width
  const H = canvas.height
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, H)
  if (!actions.length) return

  // Figure out bounding box of all actions
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const a of actions) {
    if (a.tool === 'pen' && a.points?.length) {
      for (const p of a.points) {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y)
        maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y)
      }
    } else if (a.x != null) {
      minX = Math.min(minX, a.x); minY = Math.min(minY, a.y)
      maxX = Math.max(maxX, (a.x2 ?? a.x) + (a.w ?? 0))
      maxY = Math.max(maxY, (a.y2 ?? a.y) + (a.h ?? 0))
    }
  }

  if (!isFinite(minX)) return

  const pad = 8
  const scaleX = (W - pad * 2) / Math.max(1, maxX - minX)
  const scaleY = (H - pad * 2) / Math.max(1, maxY - minY)
  const scale = Math.min(scaleX, scaleY, 1)
  const offX = pad + (W - pad * 2 - (maxX - minX) * scale) / 2 - minX * scale
  const offY = pad + (H - pad * 2 - (maxY - minY) * scale) / 2 - minY * scale

  ctx.save()
  ctx.translate(offX, offY)
  ctx.scale(scale, scale)

  for (const a of actions) {
    ctx.beginPath()
    ctx.strokeStyle = a.color || '#e8eaed'
    ctx.fillStyle = a.color || '#e8eaed'
    ctx.lineWidth = Math.max(1, (a.strokeWidth || 2) * 0.6)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    switch (a.tool) {
      case 'pen':
        if (a.points?.length >= 2) {
          ctx.moveTo(a.points[0].x, a.points[0].y)
          for (let i = 1; i < a.points.length; i++) ctx.lineTo(a.points[i].x, a.points[i].y)
          ctx.stroke()
        }
        break
      case 'rect':
        ctx.strokeRect(a.x, a.y, a.w, a.h)
        break
      case 'circle':
        ctx.ellipse(a.x + a.w / 2, a.y + a.h / 2, a.w / 2, a.h / 2, 0, 0, Math.PI * 2)
        ctx.stroke()
        break
      case 'line':
      case 'arrow':
        ctx.moveTo(a.x1 ?? a.x, a.y1 ?? a.y)
        ctx.lineTo(a.x2, a.y2)
        ctx.stroke()
        break
      case 'text':
        ctx.font = `${Math.max(8, (a.fontSize || 16) * 0.5)}px sans-serif`
        ctx.fillText(a.text || '', a.x, a.y + 12)
        break
      case 'sticky':
        ctx.fillStyle = '#fef08a'
        ctx.fillRect(a.x, a.y, a.w || 80, a.h || 80)
        break
      default:
        break
    }
  }
  ctx.restore()
}

export default function RoomThumbnail({ actions = [], accentColor = '#53fc18', name = '', className = '' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    drawMini(canvasRef.current, actions)
  }, [actions])

  const hasContent = actions.length > 0

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: BG }}>
      {hasContent ? (
        <canvas
          ref={canvasRef}
          width={280}
          height={140}
          className="w-full h-full"
          style={{ display: 'block' }}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
          <div
            className="text-3xl font-black"
            style={{ color: accentColor, opacity: 0.25, fontFamily: 'monospace', letterSpacing: '-0.05em' }}
          >
            {(name || 'R').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex gap-1 opacity-20">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-full" style={{ width: 4 + i * 2, height: 4 + i * 2, background: accentColor }} />
            ))}
          </div>
        </div>
      )}
      {/* subtle accent border on bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: accentColor, opacity: 0.4 }} />
    </div>
  )
}
