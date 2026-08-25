import { useRef, useState, useEffect, useCallback } from 'react'
import {
  MousePointer2, Pencil, Type, StickyNote, Circle, Square, Eraser,
  Minus, Plus, Maximize, Minimize, Trash2,
  Undo2, Redo2, Zap, ArrowUpRight, Download,
} from 'lucide-react'

const COLORS = ['#000000', '#e53e3e', '#dd6b20', '#d69e2e', '#38a169', '#3182ce', '#805ad5', '#d53f8c', '#ffffff']
const STROKE_WIDTHS = [2, 4, 6, 8]
const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]
const LASER_FADE_MS = 1500

function hitTest(action, px, py) {
  if (!action) return false
  const pad = 12
  switch (action.tool) {
    case 'rect':
      return px >= action.x - pad && px <= action.x + (action.w || 150) + pad &&
             py >= action.y - pad && py <= action.y + (action.h || 100) + pad
    case 'circle':
      return px >= action.x - pad && px <= action.x + (action.w || 100) + pad &&
             py >= action.y - pad && py <= action.y + (action.h || 100) + pad
    case 'text':
      return px >= action.x - pad && px <= action.x + (action.w || 200) + pad &&
             py >= action.y - pad && py <= action.y + (action.h || 32) + pad
    case 'sticky':
      return px >= action.x - pad && px <= action.x + (action.w || 180) + pad &&
             py >= action.y - pad && py <= action.y + (action.h || 180) + pad
    case 'line': case 'arrow': {
      const { x1, y1, x2, y2 } = action
      if (x1 == null || x2 == null) return false
      const A = { x: px - x1, y: py - y1 }
      const B = { x: x2 - x1, y: y2 - y1 }
      const lenSq = B.x * B.x + B.y * B.y
      if (lenSq === 0) return Math.hypot(A.x, A.y) <= pad
      let t = Math.max(0, Math.min(1, (A.x * B.x + A.y * B.y) / lenSq))
      return Math.hypot(px - (x1 + t * B.x), py - (y1 + t * B.y)) <= pad
    }
    case 'pen': {
      if (!action.points?.length) return false
      for (let i = 1; i < action.points.length; i++) {
        const p0 = action.points[i - 1], p1 = action.points[i]
        const A = { x: px - p0.x, y: py - p0.y }
        const B = { x: p1.x - p0.x, y: p1.y - p0.y }
        const lenSq = B.x * B.x + B.y * B.y
        if (lenSq === 0) { if (Math.hypot(A.x, A.y) <= pad) return true; continue }
        let t = Math.max(0, Math.min(1, (A.x * B.x + A.y * B.y) / lenSq))
        if (Math.hypot(px - (p0.x + t * B.x), py - (p0.y + t * B.y)) <= pad) return true
      }
      return false
    }
    default: return false
  }
}

function drawAction(ctx, action, selectedId) {
  if (!action) return
  ctx.save()
  switch (action.tool) {
    case 'line': case 'arrow': {
      ctx.strokeStyle = action.color
      ctx.lineWidth = action.strokeWidth
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(action.x1, action.y1)
      ctx.lineTo(action.x2, action.y2)
      ctx.stroke()
      if (action.tool === 'arrow' && action.x2 != null) {
        const dx = action.x2 - action.x1, dy = action.y2 - action.y1
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        const nx = dx / len, ny = dy / len
        const hl = Math.min(16, action.strokeWidth * 4)
        ctx.fillStyle = action.color
        ctx.beginPath()
        ctx.moveTo(action.x2, action.y2)
        ctx.lineTo(action.x2 - hl * nx - hl * 0.35 * ny, action.y2 - hl * ny + hl * 0.35 * nx)
        ctx.lineTo(action.x2 - hl * nx + hl * 0.35 * ny, action.y2 - hl * ny - hl * 0.35 * nx)
        ctx.closePath()
        ctx.fill()
      }
      break
    }
    case 'pen':
      if (action.points?.length > 1) {
        ctx.strokeStyle = action.color
        ctx.lineWidth = action.strokeWidth
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(action.points[0].x, action.points[0].y)
        for (let i = 1; i < action.points.length; i++) ctx.lineTo(action.points[i].x, action.points[i].y)
        ctx.stroke()
      }
      break
    case 'text': {
      const fs = action.fontSize || 20
      ctx.font = `${fs}px Inter, sans-serif`
      ctx.fillStyle = action.color
      ctx.textBaseline = 'top'
      ;(action.text || '').split('\n').forEach((line, i) => {
        ctx.fillText(line, action.x, action.y + i * fs * 1.4)
      })
      break
    }
    case 'sticky': {
      const sw = action.w || 180, sh = action.h || 180
      ctx.fillStyle = action.color || '#fef08a'
      ctx.shadowColor = 'rgba(0,0,0,0.12)'
      ctx.shadowBlur = 6
      ctx.shadowOffsetY = 2
      ctx.fillRect(action.x, action.y, sw, sh)
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetY = 0
      if (action.text) {
        ctx.fillStyle = '#1e1c26'
        ctx.font = '14px Inter, sans-serif'
        ctx.textBaseline = 'top'
        ctx.save()
        ctx.beginPath()
        ctx.rect(action.x, action.y, sw, sh)
        ctx.clip()
        action.text.split('\n').forEach((line, i) => {
          const ty = action.y + 28 + i * 20
          if (ty < action.y + sh - 8) ctx.fillText(line, action.x + 10, ty)
        })
        ctx.restore()
      }
      break
    }
    case 'rect': {
      const rw = action.w || 150, rh = action.h || 100
      ctx.strokeStyle = action.color
      ctx.lineWidth = action.strokeWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeRect(action.x, action.y, rw, rh)
      break
    }
    case 'circle': {
      const cw = action.w || 100, ch = action.h || 100
      ctx.strokeStyle = action.color
      ctx.lineWidth = action.strokeWidth
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.ellipse(action.x + cw / 2, action.y + ch / 2, Math.max(cw / 2, 1), Math.max(ch / 2, 1), 0, 0, Math.PI * 2)
      ctx.stroke()
      break
    }
  }
  ctx.restore()

  if (action._id && action._id === selectedId) {
    ctx.save()
    let sx, sy, sw, sh
    switch (action.tool) {
      case 'rect': sw = action.w || 150; sh = action.h || 100; sx = action.x; sy = action.y; break
      case 'circle': sw = action.w || 100; sh = action.h || 100; sx = action.x; sy = action.y; break
      case 'text': sw = 200; sh = (action.fontSize || 20) * 1.4; sx = action.x; sy = action.y; break
      case 'sticky': sw = action.w || 180; sh = action.h || 180; sx = action.x; sy = action.y; break
      case 'pen': {
        if (!action.points?.length) break
        const xs = action.points.map(p => p.x), ys = action.points.map(p => p.y)
        sx = Math.min(...xs) - 8; sy = Math.min(...ys) - 8
        sw = Math.max(...xs) - sx + 16; sh = Math.max(...ys) - sy + 16; break
      }
      case 'line': case 'arrow': {
        const lx = Math.min(action.x1, action.x2 ?? action.x1)
        const ly = Math.min(action.y1, action.y2 ?? action.y1)
        sx = lx - 8; sy = ly - 8
        sw = Math.abs((action.x2 ?? action.x1) - action.x1) + 16
        sh = Math.abs((action.y2 ?? action.y1) - action.y1) + 16; break
      }
    }
    if (sx != null) {
      ctx.strokeStyle = '#0f71ef'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 3])
      ctx.strokeRect(sx, sy, sw, sh)
      ctx.setLineDash([])
    }
    ctx.restore()
  }
}

export default function Whiteboard({
  boardName, standalone, connected, roomUsers, remoteCursors,
  actions = [], onDraw, onCursor, onClear, onUndo, onLivePath, onLivePathEnd,
  fullScreen, onToggleFullScreen, canvasRef: externalCanvasRef,
  onMove, readOnly, livePaths = [],
}) {
  const canvasRef = useRef(null)
  const overlayRef = useRef(null)
  const containerRef = useRef(null)
  const fileInputRef = useRef(null)

  const [activeTool, setActiveTool] = useState('pen')
  const [color, setColor] = useState('#000000')
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [zoom, setZoom] = useState(1)
  const [undoStack, setUndoStack] = useState([])
  const [redoStack, setRedoStack] = useState([])
  const [selectedActionId, setSelectedActionId] = useState(null)

  const [textInput, setTextInput] = useState('')
  const [showTextInput, setShowTextInput] = useState(false)
  const [textPos, setTextPos] = useState({ x: 0, y: 0 })
  const [stickyText, setStickyText] = useState('')
  const [showStickyInput, setShowStickyInput] = useState(false)
  const [stickyPos, setStickyPos] = useState({ x: 0, y: 0 })
  const [laserTrails, setLaserTrails] = useState([])

  const panRef = useRef({ x: 0, y: 0 })
  const spaceRef = useRef(false)
  const drawRef = useRef({ active: false, type: null })
  const startRef = useRef(null)
  const currentPathRef = useRef([])
  const selectDragRef = useRef(null)
  const lastCursorRef = useRef(0)

  const effectiveCanvasRef = externalCanvasRef || canvasRef

  const getCanvasSize = useCallback(() => {
    const c = effectiveCanvasRef.current
    return c ? { w: c.offsetWidth, h: c.offsetHeight } : { w: 800, h: 600 }
  }, [effectiveCanvasRef])

  const screenToWorld = useCallback((e) => {
    const c = effectiveCanvasRef.current
    if (!c) return { x: 0, y: 0 }
    const rect = c.getBoundingClientRect()
    const cx = (e.touches ? e.touches[0]?.clientX ?? e.changedTouches?.[0]?.clientX ?? 0 : e.clientX) - rect.left
    const cy = (e.touches ? e.touches[0]?.clientY ?? e.changedTouches?.[0]?.clientY ?? 0 : e.clientY) - rect.top
    return {
      x: (cx - panRef.current.x) / zoom,
      y: (cy - panRef.current.y) / zoom,
    }
  }, [zoom, effectiveCanvasRef])

  const renderCanvas = useCallback((canvas, toRender, selectedId) => {
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const cssW = canvas.offsetWidth
    const cssH = canvas.offsetHeight
    if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
      canvas.width = cssW * dpr
      canvas.height = cssH * dpr
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, cssW, cssH)
    ctx.save()
    ctx.translate(panRef.current.x, panRef.current.y)
    ctx.scale(zoom, zoom)
    toRender.forEach(action => drawAction(ctx, action, selectedId))
    ctx.restore()
  }, [zoom])

  const renderMain = useCallback(() => {
    renderCanvas(effectiveCanvasRef.current, [...actions, ...livePaths], selectedActionId)
  }, [renderCanvas, actions, livePaths, selectedActionId, effectiveCanvasRef])

  const renderOverlay = useCallback((action) => {
    const c = overlayRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const cssW = c.offsetWidth
    const cssH = c.offsetHeight
    if (c.width !== cssW * dpr || c.height !== cssH * dpr) {
      c.width = cssW * dpr
      c.height = cssH * dpr
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)
    if (action) {
      ctx.save()
      ctx.translate(panRef.current.x, panRef.current.y)
      ctx.scale(zoom, zoom)
      drawAction(ctx, action, null)
      ctx.restore()
    }
  }, [zoom, effectiveCanvasRef])

  useEffect(() => { renderMain() }, [renderMain])

  useEffect(() => {
    const sync = () => renderMain()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [renderMain])

  useEffect(() => {
    let af
    const tick = () => {
      setLaserTrails(p => p.filter(t => Date.now() - t.time < LASER_FADE_MS))
      af = requestAnimationFrame(tick)
    }
    af = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(af)
  }, [])

  useEffect(() => {
    const c = overlayRef.current
    if (!c) return
    const onWheel = (e) => {
      e.preventDefault()
      setZoom(z => Math.min(3, Math.max(0.1, z + (e.deltaY > 0 ? -0.05 : 0.05))))
    }
    c.addEventListener('wheel', onWheel, { passive: false })
    return () => c.removeEventListener('wheel', onWheel)
  }, [])

  const commitPen = useCallback(() => {
    const pts = currentPathRef.current
    if (pts.length > 1 && onDraw) {
      onDraw({ tool: 'pen', points: [...pts], color, strokeWidth })
    }
    currentPathRef.current = []
    renderOverlay(null)
  }, [onDraw, color, strokeWidth, renderOverlay])

  const commitShape = useCallback((endPos) => {
    const start = startRef.current
    if (!start || !onDraw) { startRef.current = null; return }
    const tool = activeTool
    if (tool === 'rect' || tool === 'circle') {
      const x = Math.min(start.x, endPos.x), y = Math.min(start.y, endPos.y)
      const w = Math.abs(endPos.x - start.x), h = Math.abs(endPos.y - start.y)
      if (w > 2 || h > 2) onDraw({ tool, x, y, w: w || 100, h: h || 100, color, strokeWidth })
    } else if (tool === 'line' || tool === 'arrow') {
      if (Math.abs(endPos.x - start.x) > 2 || Math.abs(endPos.y - start.y) > 2) {
        onDraw({ tool, x1: start.x, y1: start.y, x2: endPos.x, y2: endPos.y, x: start.x, y: start.y, color, strokeWidth })
      }
    }
    startRef.current = null
    renderOverlay(null)
  }, [activeTool, color, strokeWidth, onDraw, renderOverlay])

  const eraseAt = useCallback((e) => {
    const c = effectiveCanvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    const pos = screenToWorld(e)
    ctx.save()
    ctx.translate(panRef.current.x, panRef.current.y)
    ctx.scale(zoom, zoom)
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, strokeWidth * 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }, [screenToWorld, strokeWidth, zoom, effectiveCanvasRef])

  const handlePointerDown = useCallback((e) => {
    const pos = screenToWorld(e)

    if (activeTool === 'select') {
      const reversed = [...actions].reverse()
      const hit = reversed.find(a => hitTest(a, pos.x, pos.y))
      if (hit) {
        setSelectedActionId(hit._id || null)
        selectDragRef.current = { id: hit._id, offsetX: pos.x - (hit.x || 0), offsetY: pos.y - (hit.y || 0) }
        return
      }
      setSelectedActionId(null)
    }

    if (e.button === 1 || spaceRef.current || activeTool === 'select') {
      drawRef.current = { active: true, type: 'pan' }
      return
    }

    if (activeTool === 'eraser') {
      drawRef.current = { active: true, type: 'eraser' }
      eraseAt(e)
      return
    }
    if (activeTool === 'laser') {
      drawRef.current = { active: true, type: 'laser' }
      setLaserTrails(p => [...p, { id: Date.now(), x: pos.x, y: pos.y, time: Date.now() }])
      if (onLivePath) onLivePath({ type: 'laser', points: [pos], color: '#e53e3e', strokeWidth: 3 })
      return
    }
    if (activeTool === 'pen') {
      drawRef.current = { active: true, type: 'pen' }
      currentPathRef.current = [pos]
      return
    }
    if (activeTool === 'text') {
      setTextPos(pos); setShowTextInput(true); setTextInput('')
      return
    }
    if (activeTool === 'sticky') {
      setStickyPos(pos); setShowStickyInput(true); setStickyText('')
      return
    }
    if (['rect', 'circle', 'line', 'arrow'].includes(activeTool)) {
      drawRef.current = { active: true, type: 'shape' }
      startRef.current = pos
      return
    }
  }, [activeTool, actions, screenToWorld, eraseAt, onLivePath])

  const handlePointerMove = useCallback((e) => {
    if (!drawRef.current.active) return
    const dt = drawRef.current.type
    const pos = screenToWorld(e)

    if (dt === 'pan') {
      const c = effectiveCanvasRef.current
      if (!c) return
      const rect = c.getBoundingClientRect()
      const cx = (e.touches ? e.touches[0]?.clientX ?? 0 : e.clientX) - rect.left
      const cy = (e.touches ? e.touches[0]?.clientY ?? 0 : e.clientY) - rect.top
      panRef.current = { x: cx - (startRef.current?.panStartX || cx), y: cy - (startRef.current?.panStartY || cy) }
      renderMain()
      return
    }

    if (onCursor && !standalone) {
      const now = Date.now()
      if (now - lastCursorRef.current > 50) {
        lastCursorRef.current = now
        onCursor({ x: pos.x, y: pos.y, userName: 'User' })
      }
    }

    if (dt === 'eraser') { eraseAt(e); return }

    if (dt === 'laser') {
      setLaserTrails(p => [...p, { id: Date.now(), x: pos.x, y: pos.y, time: Date.now() }])
      if (onLivePath) onLivePath({ type: 'laser', points: [pos], color: '#e53e3e', strokeWidth: 3 })
      return
    }

    if (dt === 'pen') {
      currentPathRef.current.push(pos)
      const pts = currentPathRef.current
      if (pts.length >= 2) {
        renderOverlay({
          tool: 'pen', points: pts, color, strokeWidth,
        })
      }
      return
    }

    if (dt === 'shape' && startRef.current) {
      const tool = activeTool
      if (tool === 'rect') {
        const x = Math.min(startRef.current.x, pos.x), y = Math.min(startRef.current.y, pos.y)
        renderOverlay({ tool: 'rect', x, y, w: Math.abs(pos.x - startRef.current.x), h: Math.abs(pos.y - startRef.current.y), color, strokeWidth })
      } else if (tool === 'circle') {
        const x = Math.min(startRef.current.x, pos.x), y = Math.min(startRef.current.y, pos.y)
        renderOverlay({ tool: 'circle', x, y, w: Math.abs(pos.x - startRef.current.x), h: Math.abs(pos.y - startRef.current.y), color, strokeWidth })
      } else if (tool === 'line' || tool === 'arrow') {
        renderOverlay({ tool, x1: startRef.current.x, y1: startRef.current.y, x2: pos.x, y2: pos.y, x: startRef.current.x, y: startRef.current.y, color, strokeWidth })
      }
      return
    }

    if (selectDragRef.current) {
      const d = selectDragRef.current
      const newX = pos.x - d.offsetX
      const newY = pos.y - d.offsetY
      const sel = actions.find(a => a._id === d.id)
      if (sel) {
        renderOverlay({ ...sel, x: newX, y: newY })
      }
    }
  }, [screenToWorld, onCursor, standalone, eraseAt, renderOverlay, renderMain, activeTool, color, strokeWidth, actions, onLivePath, effectiveCanvasRef])

  const handlePointerUp = useCallback((e) => {
    const dt = drawRef.current.type
    const wasActive = drawRef.current.active
    drawRef.current = { active: false, type: null }

    if (!wasActive) return
    const pos = screenToWorld(e)

    if (dt === 'pan') { renderMain(); return }
    if (dt === 'eraser') return
    if (dt === 'laser') { if (onLivePathEnd) onLivePathEnd(); return }
    if (dt === 'pen') { commitPen(); return }
    if (dt === 'shape') { commitShape(pos); return }

    if (selectDragRef.current) {
      const d = selectDragRef.current
      const sel = actions.find(a => a._id === d.id)
      if (sel) {
        const newX = pos.x - d.offsetX, newY = pos.y - d.offsetY
        if (Math.abs(newX - (sel.x || 0)) > 1 || Math.abs(newY - (sel.y || 0)) > 1) {
          if (onMove) onMove(d.id, newX, newY)
          else if (onUndo) { onUndo(sel._id); onDraw?.({ ...sel, x: newX, y: newY }) }
        }
      }
      selectDragRef.current = null
      setSelectedActionId(null)
      renderOverlay(null)
    }
  }, [screenToWorld, renderMain, commitPen, commitShape, actions, onMove, onUndo, onDraw, onLivePathEnd, renderOverlay])

  useEffect(() => {
    const handlePanStart = (e) => {
      if (e.button === 1 || spaceRef.current) {
        const c = effectiveCanvasRef.current
        if (!c) return
        const rect = c.getBoundingClientRect()
        const cx = e.clientX - rect.left
        const cy = e.clientY - rect.top
        startRef.current = { panStartX: cx - panRef.current.x, panStartY: cy - panRef.current.y }
      }
    }
    const c = effectiveCanvasRef.current
    if (c) c.addEventListener('mousedown', handlePanStart)
    return () => { if (c) c.removeEventListener('mousedown', handlePanStart) }
  }, [effectiveCanvasRef])

  const handleTextSubmit = useCallback(() => {
    if (textInput.trim()) {
      onDraw?.({ tool: 'text', x: textPos.x, y: textPos.y, w: 200, h: 32, text: textInput, color, strokeWidth, fontSize: 20 })
    }
    setShowTextInput(false); setTextInput('')
  }, [textInput, textPos, color, strokeWidth, onDraw])

  const handleStickySubmit = useCallback(() => {
    if (stickyText.trim()) {
      onDraw?.({ tool: 'sticky', x: stickyPos.x, y: stickyPos.y, w: 180, h: 180, color: '#fef08a', text: stickyText, strokeWidth: 0 })
    }
    setShowStickyInput(false); setStickyText('')
  }, [stickyText, stickyPos, onDraw])

  const MAX_UNDO_REDO = 100

  const handleUndoClick = useCallback(() => {
    const last = actions[actions.length - 1]
    if (last?._id) {
      onUndo?.(last._id)
      setRedoStack(p => { const next = [...p, { action: last }]; return next.length > MAX_UNDO_REDO ? next.slice(next.length - MAX_UNDO_REDO) : next })
      if (selectedActionId === last._id) setSelectedActionId(null)
    }
  }, [actions, onUndo, selectedActionId])

  const handleRedoClick = useCallback(() => {
    setRedoStack(p => {
      if (!p.length) return p
      const entry = p[p.length - 1]
      const next = p.slice(0, -1)
      if (entry?.action) onDraw?.(entry.action)
      return next
    })
  }, [onDraw])

  const deleteSelected = useCallback(() => {
    if (!selectedActionId) return
    const sel = actions.find(a => a._id === selectedActionId)
    if (sel && onUndo) {
      onUndo(sel._id)
      setRedoStack(p => { const next = [...p, { action: sel }]; return next.length > MAX_UNDO_REDO ? next.slice(next.length - MAX_UNDO_REDO) : next })
      setSelectedActionId(null)
    }
  }, [selectedActionId, actions, onUndo])

  useEffect(() => {
    const handleKey = (e) => {
      const el = document.activeElement
      if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA') return

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndoClick(); return }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); handleRedoClick(); return }
      if ((e.ctrlKey || e.metaKey) && e.key === '=') { e.preventDefault(); setZoom(z => Math.min(3, z + 0.1)); return }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); setZoom(z => Math.max(0.1, z - 0.1)); return }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); setZoom(1); panRef.current = { x: 0, y: 0 }; renderMain(); return }
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); return }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedActionId) { e.preventDefault(); deleteSelected(); return }

      const toolMap = { v: 'select', p: 'pen', t: 'text', s: 'sticky', r: 'rect', o: 'circle', c: 'circle', l: 'line', a: 'arrow', e: 'eraser', x: 'laser' }
      const mapped = toolMap[e.key.toLowerCase()]
      if (mapped) setActiveTool(mapped)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [selectedActionId, renderMain, handleUndoClick, handleRedoClick, deleteSelected])

  const handleClear = useCallback(() => {
    onClear?.()
    setUndoStack([]); setRedoStack([]); setSelectedActionId(null)
  }, [onClear])

  const handleExport = useCallback(() => {
    const c = effectiveCanvasRef.current
    if (!c) return
    const tmp = document.createElement('canvas')
    tmp.width = c.offsetWidth; tmp.height = c.offsetHeight
    const tmpPan = panRef.current
    const oldPan = { ...panRef.current }
    panRef.current = { x: 0, y: 0 }
    renderCanvas(tmp, actions, null)
    panRef.current = oldPan
    const link = document.createElement('a')
    link.download = `${boardName || 'whiteboard'}.png`
    link.href = tmp.toDataURL('image/png')
    link.click()
  }, [actions, boardName, renderCanvas, effectiveCanvasRef])

  const handleImageInsert = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        onDraw?.({ tool: 'image', x: 100 + Math.random() * 100, y: 100 + Math.random() * 100, w: img.width / 2, h: img.height / 2, src: ev.target.result, color, strokeWidth })
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [onDraw, color, strokeWidth])

  const cursorMap = {
    select: 'default', pen: 'crosshair', text: 'text', sticky: 'crosshair',
    rect: 'crosshair', circle: 'crosshair', line: 'crosshair', arrow: 'crosshair',
    eraser: 'crosshair', laser: 'crosshair',
  }
  if (spaceRef.current) cursorMap.select = 'grab'

  const toolDefs = [
    { key: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
    { key: 'pen', icon: Pencil, label: 'Pen', shortcut: 'P' },
    { key: 'text', icon: Type, label: 'Text', shortcut: 'T' },
    { key: 'sticky', icon: StickyNote, label: 'Sticky', shortcut: 'S' },
    { key: 'rect', icon: Square, label: 'Rectangle', shortcut: 'R' },
    { key: 'circle', icon: Circle, label: 'Circle', shortcut: 'O' },
    { key: 'line', icon: Minus, label: 'Line', shortcut: 'L' },
    { key: 'arrow', icon: ArrowUpRight, label: 'Arrow', shortcut: 'A' },
    { key: 'eraser', icon: Eraser, label: 'Eraser', shortcut: 'E' },
    { key: 'laser', icon: Zap, label: 'Laser', shortcut: 'X' },
  ]

  return (
    <div ref={containerRef} className="w-full h-full bg-white flex flex-col relative select-none">
      {showTextInput && (
        <div className="absolute z-50" style={{ left: textPos.x * zoom + panRef.current.x, top: textPos.y * zoom + panRef.current.y }}>
          <textarea
            autoFocus
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSubmit() }
              if (e.key === 'Escape') { setShowTextInput(false); setTextInput('') }
              e.stopPropagation()
            }}
            onBlur={handleTextSubmit}
            className="bg-white/95 border border-zoom-blue/50 rounded px-2 py-1 text-sm text-black resize-none outline-none min-w-[120px]"
            style={{ fontSize: 20 * zoom, color }}
            placeholder="Type here..."
            rows={1}
          />
        </div>
      )}

      {showStickyInput && (
        <div className="absolute z-50" style={{ left: stickyPos.x * zoom + panRef.current.x, top: stickyPos.y * zoom + panRef.current.y }}>
          <textarea
            autoFocus
            value={stickyText}
            onChange={(e) => setStickyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setShowStickyInput(false); setStickyText('') }
              e.stopPropagation()
            }}
            onBlur={handleStickySubmit}
            className="bg-yellow-100 border border-yellow-300 rounded px-2 py-1 text-sm text-black resize-none outline-none min-w-[150px] min-h-[60px]"
            placeholder="Sticky note..."
          />
        </div>
      )}

      {laserTrails.map(trail => {
        const progress = Math.min((Date.now() - trail.time) / LASER_FADE_MS, 1)
        return (
          <div
            key={trail.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: trail.x * zoom + panRef.current.x - 5,
              top: trail.y * zoom + panRef.current.y - 5,
              width: 10, height: 10,
              backgroundColor: '#e53e3e',
              opacity: 1 - progress,
              boxShadow: '0 0 6px 2px rgba(229,62,62,0.4)',
            }}
          />
        )
      })}

      <div className="flex-1 relative overflow-hidden" style={{ cursor: cursorMap[activeTool] || 'crosshair' }}>
        <canvas
          ref={effectiveCanvasRef}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={() => { drawRef.current = { active: false, type: null }; renderOverlay(null) }}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          className="absolute inset-0 w-full h-full touch-none"
        />
        <canvas
          ref={overlayRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      </div>

      <div
        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30
          flex items-center gap-1 bg-zoom-dark rounded-xl px-2.5 py-1.5 shadow-xl border border-white/8"
      >
        <button onClick={handleUndoClick} disabled={!actions.length}
          title="Undo (Ctrl+Z)"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
          <Undo2 size={15} />
        </button>
        <button onClick={handleRedoClick} disabled={!redoStack.length}
          title="Redo (Ctrl+Shift+Z)"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
          <Redo2 size={15} />
        </button>

        <div className="w-px h-5 bg-white/15 mx-0.5" />

        {toolDefs.map(({ key, icon: Icon, label, shortcut }) => (
          <button key={key} onClick={() => setActiveTool(key)}
            title={`${label} (${shortcut})`}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              activeTool === key ? 'bg-zoom-blue text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}>
            <Icon size={14} />
          </button>
        ))}

        <div className="w-px h-5 bg-white/15 mx-0.5" />

        <div className="flex items-center gap-0.5">
          {COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} title={c}
              className={`w-[18px] h-[18px] rounded-full border transition-all ${
                color === c ? 'border-zoom-blue ring-1 ring-zoom-blue scale-110' : 'border-white/20 hover:border-white/50'
              }`} style={{ backgroundColor: c }} />
          ))}
        </div>

        {activeTool !== 'laser' && activeTool !== 'text' && activeTool !== 'select' && (
          <>
            <div className="w-px h-5 bg-white/15 mx-0.5" />
            <div className="flex items-center gap-0.5">
              {STROKE_WIDTHS.map((sw) => (
                <button key={sw} onClick={() => setStrokeWidth(sw)} title={`${sw}px`}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                    strokeWidth === sw ? 'bg-zoom-blue/30 text-zoom-blue' : 'text-white/50 hover:text-white hover:bg-white/10'
                  }`}>
                  <div className="rounded-full bg-current" style={{ width: sw + 2, height: sw + 2 }} />
                </button>
              ))}
            </div>
          </>
        )}

        <div className="w-px h-5 bg-white/15 mx-0.5" />

        <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} title="Zoom Out (Ctrl+-)"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors">
          <Minus size={13} />
        </button>
        <span className="text-[10px] text-white/60 font-mono min-w-[36px] text-center select-none">
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} title="Zoom In (Ctrl+=)"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors">
          <Plus size={13} />
        </button>

        <div className="w-px h-5 bg-white/15 mx-0.5" />

        <button onClick={handleExport} title="Export as PNG"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors">
          <Download size={13} />
        </button>

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageInsert} />
        <button onClick={() => fileInputRef.current?.click()} title="Insert Image"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
        </button>

        {onClear && (
          <button onClick={handleClear} title="Clear Board"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:text-red-300 hover:bg-white/10 transition-colors">
            <Trash2 size={13} />
          </button>
        )}

        {onToggleFullScreen && (
          <button onClick={onToggleFullScreen} title={fullScreen ? 'Exit Full Screen (Esc)' : 'Full Screen'}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors">
            {fullScreen ? <Minimize size={13} /> : <Maximize size={13} />}
          </button>
        )}
      </div>
    </div>
  )
}