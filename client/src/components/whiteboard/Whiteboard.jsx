import { useRef, useState, useEffect, useCallback } from 'react'
import {
  MousePointer2, Pencil, Type, StickyNote, Circle, Square, Eraser,
  Minus, Plus, Maximize, Minimize, Trash2,
  Undo2, Redo2, Zap, ArrowUpRight, Download,
} from 'lucide-react'

const TOOLS = ['select', 'pen', 'text', 'sticky', 'rect', 'circle', 'line', 'arrow', 'eraser', 'laser']
const COLORS = ['#000000', '#e53e3e', '#dd6b20', '#d69e2e', '#38a169', '#3182ce', '#805ad5', '#d53f8c', '#ffffff']
const STROKE_WIDTHS = [2, 4, 6, 8]
const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]
const LASER_FADE_MS = 1500
const CANVAS_TOP_OFFSET = 0

function hitTestPoint(action, px, py) {
  if (!action) return false
  const pad = 12
  switch (action.tool) {
    case 'rect':
      return px >= action.x - pad && px <= action.x + (action.w ?? 150) + pad &&
             py >= action.y - pad && py <= action.y + (action.h ?? 100) + pad
    case 'circle':
      return px >= action.x - pad && px <= action.x + (action.w ?? 100) + pad &&
             py >= action.y - pad && py <= action.y + (action.h ?? 100) + pad
    case 'text':
      return px >= action.x - pad && px <= action.x + (action.w ?? 200) + pad &&
             py >= action.y - pad && py <= action.y + (action.h ?? 32) + pad
    case 'sticky':
      return px >= action.x - pad && px <= action.x + (action.w ?? 180) + pad &&
             py >= action.y - pad && py <= action.y + (action.h ?? 180) + pad
    case 'line': case 'arrow': {
      const { x1, y1, x2, y2 } = action
      if (x1 == null || x2 == null) return false
      const A = { x: px - x1, y: py - y1 }
      const B = { x: x2 - x1, y: y2 - y1 }
      const lenSq = B.x * B.x + B.y * B.y
      if (lenSq === 0) return Math.hypot(A.x, A.y) <= pad
      let t = Math.max(0, Math.min(1, (A.x * B.x + A.y * B.y) / lenSq))
      const cx = x1 + t * B.x, cy = y1 + t * B.y
      return Math.hypot(px - cx, py - cy) <= pad
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
        const cx = p0.x + t * B.x, cy = p0.y + t * B.y
        if (Math.hypot(px - cx, py - cy) <= pad) return true
      }
      return false
    }
    default: return false
  }
}

export default function Whiteboard({
  boardName, standalone, connected, roomUsers, remoteCursors,
  actions = [], onDraw, onCursor, onClear, onUndo, onLivePath, onLivePathEnd,
  fullScreen, onToggleFullScreen, canvasRef: externalCanvasRef,
  pomodoroOpen, onTogglePomodoro, recorderOpen, onToggleRecorder, recording,
  panelTab, onTogglePanel, fileCount, readOnly, livePaths = [],
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)

  const [activeTool, setActiveTool] = useState('pen')
  const [color, setColor] = useState('#000000')
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState([])
  const [textInput, setTextInput] = useState('')
  const [showTextInput, setShowTextInput] = useState(false)
  const [textPos, setTextPos] = useState({ x: 0, y: 0 })
  const [stickyText, setStickyText] = useState('')
  const [showStickyInput, setShowStickyInput] = useState(false)
  const [stickyPos, setStickyPos] = useState({ x: 0, y: 0 })
  const [shapeStart, setShapeStart] = useState(null)
  const [shapePreview, setShapePreview] = useState(null)
  const [selectedActionId, setSelectedActionId] = useState(null)
  const [dragOffset, setDragOffset] = useState(null)
  const [undoStack, setUndoStack] = useState([])
  const [redoStack, setRedoStack] = useState([])
  const [laserTrails, setLaserTrails] = useState([])

  const panRef = useRef({ x: 0, y: 0 })
  const lastMouseRef = useRef({ x: 0, y: 0 })
  const spaceRef = useRef(false)
  const drawingRef = useRef(false)
  const lastLiveEmitRef = useRef(0)
  const fileInputRef = useRef(null)

  const effectiveCanvasRef = externalCanvasRef || canvasRef
  const allActions = [...actions, ...livePaths]

  const getPointerPos = useCallback((e) => {
    const canvas = effectiveCanvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0]?.clientX ?? e.changedTouches?.[0]?.clientX ?? 0 : e.clientX
    const clientY = e.touches ? e.touches[0]?.clientY ?? e.changedTouches?.[0]?.clientY ?? 0 : e.clientY
    return {
      x: (clientX - rect.left - panRef.current.x) / zoom,
      y: (clientY - rect.top - CANVAS_TOP_OFFSET - panRef.current.y) / zoom,
    }
  }, [zoom, effectiveCanvasRef])

  const renderAll = useCallback((canvas, ctx, toRender) => {
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    toRender.forEach((action) => {
      if (action.socketId && livePaths?.some?.(lp => lp.socketId === action.socketId)) return
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
            for (let i = 1; i < action.points.length; i++) {
              ctx.lineTo(action.points[i].x, action.points[i].y)
            }
            ctx.stroke()
          }
          break
        case 'text': {
          ctx.font = `${action.fontSize || 20}px Inter, sans-serif`
          ctx.fillStyle = action.color
          ctx.textBaseline = 'top'
          const lines = (action.text || '').split('\n')
          lines.forEach((line, i) => {
            ctx.fillText(line, action.x, action.y + i * (action.fontSize || 20) * 1.4)
          })
          break
        }
        case 'sticky': {
          const sw = action.w || 180, sh = action.h || 180
          ctx.fillStyle = action.color || '#fef08a'
          ctx.shadowColor = 'rgba(0,0,0,0.12)'
          ctx.shadowBlur = 6
          ctx.shadowOffsetY = 2
          ctx.beginPath()
          ctx.roundRect(action.x, action.y, sw, sh, 4)
          ctx.fill()
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
          const rw = action.w ?? 150, rh = action.h ?? 100
          ctx.strokeStyle = action.color
          ctx.lineWidth = action.strokeWidth
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.strokeRect(action.x, action.y, rw, rh)
          break
        }
        case 'circle': {
          const cw = action.w ?? 100, ch = action.h ?? 100
          ctx.strokeStyle = action.color
          ctx.lineWidth = action.strokeWidth
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.ellipse(action.x + cw / 2, action.y + ch / 2, cw / 2 || 1, ch / 2 || 1, 0, 0, Math.PI * 2)
          ctx.stroke()
          break
        }
      }
      ctx.restore()
    })

    if (selectedActionId) {
      const sel = actions.find(a => a._id === selectedActionId)
      if (sel) {
        ctx.save()
        let sx, sy, sw, sh
        switch (sel.tool) {
          case 'rect': sw = sel.w ?? 150; sh = sel.h ?? 100; sx = sel.x; sy = sel.y; break
          case 'circle': sw = sel.w ?? 100; sh = sel.h ?? 100; sx = sel.x; sy = sel.y; break
          case 'text': sw = 200; sh = (sel.fontSize || 20) * 1.4; sx = sel.x; sy = sel.y; break
          case 'sticky': sw = sel.w ?? 180; sh = sel.h ?? 180; sx = sel.x; sy = sel.y; break
          case 'pen': {
            if (!sel.points?.length) break
            const xs = sel.points.map(p => p.x), ys = sel.points.map(p => p.y)
            sx = Math.min(...xs) - 8; sy = Math.min(...ys) - 8
            sw = Math.max(...xs) - sx + 16; sh = Math.max(...ys) - sy + 16; break
          }
          case 'line': case 'arrow': {
            const lx = Math.min(sel.x1, sel.x2 ?? sel.x1)
            const ly = Math.min(sel.y1, sel.y2 ?? sel.y1)
            sx = lx - 8; sy = ly - 8
            sw = Math.abs((sel.x2 ?? sel.x1) - sel.x1) + 16
            sh = Math.abs((sel.y2 ?? sel.y1) - sel.y1) + 16; break
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
  }, [actions, selectedActionId, livePaths])

  const syncCanvasSize = useCallback(() => {
    const canvas = effectiveCanvasRef.current
    if (!canvas) return
    canvas.width = canvas.offsetWidth * 2
    canvas.height = canvas.offsetHeight * 2
    const ctx = canvas.getContext('2d')
    renderAll(canvas, ctx, allActions)
  }, [effectiveCanvasRef, renderAll, allActions])

  useEffect(() => { syncCanvasSize() }, [fullScreen, syncCanvasSize])
  useEffect(() => {
    const h = () => syncCanvasSize()
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [syncCanvasSize])

  useEffect(() => {
    const canvas = effectiveCanvasRef.current
    if (!canvas) return
    renderAll(canvas, canvas.getContext('2d'), allActions)
  }, [allActions, renderAll, effectiveCanvasRef])

  useEffect(() => {
    let animFrame
    const tick = () => {
      setLaserTrails(prev => prev.filter(t => Date.now() - t.time < LASER_FADE_MS))
      animFrame = requestAnimationFrame(tick)
    }
    animFrame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animFrame)
  }, [])

  const handleUndoClick = useCallback(() => {
    const last = actions[actions.length - 1]
    if (last?._id) {
      onUndo?.(last._id)
      setRedoStack(prev => [...prev, { action: last }])
      if (selectedActionId === last._id) setSelectedActionId(null)
    }
  }, [actions, onUndo, selectedActionId])

  const handleRedoClick = useCallback(() => {
    setRedoStack(prev => {
      if (!prev.length) return prev
      const entry = prev[prev.length - 1]
      const next = prev.slice(0, -1)
      if (entry?.action) onDraw?.(entry.action)
      return next
    })
  }, [onDraw])

  const handleZoomIn = useCallback(() => {
    setZoom(z => {
      const i = ZOOM_LEVELS.findIndex(v => v >= z)
      return ZOOM_LEVELS[Math.min((i === -1 ? ZOOM_LEVELS.length - 1 : i) + 1, ZOOM_LEVELS.length - 1)]
    })
  }, [])
  const handleZoomOut = useCallback(() => {
    setZoom(z => {
      const i = ZOOM_LEVELS.findIndex(v => v >= z)
      return ZOOM_LEVELS[Math.max((i === -1 ? 0 : i) - 1, 0)]
    })
  }, [])

  const handleClear = useCallback(() => {
    onClear?.()
    setUndoStack([]); setRedoStack([]); setSelectedActionId(null)
  }, [onClear])

  const deleteSelected = useCallback(() => {
    if (selectedActionId && onUndo) {
      const sel = actions.find(a => a._id === selectedActionId)
      if (sel) {
        onUndo(sel._id)
        setRedoStack(prev => [...prev, { action: sel }])
        setSelectedActionId(null)
      }
    }
  }, [selectedActionId, actions, onUndo])

  const handleExport = useCallback(() => {
    const canvas = effectiveCanvasRef.current
    if (!canvas) return
    const tmp = document.createElement('canvas')
    tmp.width = canvas.offsetWidth; tmp.height = canvas.offsetHeight
    renderAll(tmp, tmp.getContext('2d'), actions)
    const link = document.createElement('a')
    link.download = `${boardName || 'whiteboard'}.png`
    link.href = tmp.toDataURL('image/png')
    link.click()
  }, [actions, boardName, renderAll, effectiveCanvasRef])

  const handleImageInsert = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        onDraw?.({
          tool: 'image', x: 100 + Math.random() * 100, y: 100 + Math.random() * 100,
          w: img.width / 2, h: img.height / 2, src: ev.target.result, color, strokeWidth,
        })
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [onDraw, color, strokeWidth])

  useEffect(() => {
    const handleKey = (e) => {
      const active = document.activeElement
      if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') return

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndoClick(); return }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); handleRedoClick(); return }
      if ((e.ctrlKey || e.metaKey) && e.key === '=') { e.preventDefault(); handleZoomIn(); return }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); handleZoomOut(); return }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); setZoom(1); setPan({ x: 0, y: 0 }); return }
      if (e.key === 'Delete' || e.key === 'Backspace') { if (selectedActionId) { e.preventDefault(); deleteSelected() }; return }

      switch (e.key.toLowerCase()) {
        case 'v': setActiveTool('select'); break
        case 'p': setActiveTool('pen'); break
        case 't': setActiveTool('text'); break
        case 's': setActiveTool('sticky'); break
        case 'r': setActiveTool('rect'); break
        case 'o': case 'c': setActiveTool('circle'); break
        case 'l': setActiveTool('line'); break
        case 'a': setActiveTool('arrow'); break
        case 'e': setActiveTool('eraser'); break
        case 'x': setActiveTool('laser'); break
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [handleUndoClick, handleRedoClick, handleZoomIn, handleZoomOut, deleteSelected, selectedActionId])

  useEffect(() => {
    const canvas = effectiveCanvasRef.current
    if (!canvas) return
    const onWheel = (e) => {
      e.preventDefault()
      setZoom(z => {
        const delta = e.deltaY > 0 ? -0.05 : 0.05
        return Math.min(3, Math.max(0.1, z + delta))
      })
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [effectiveCanvasRef])

  const handlePointerDown = useCallback((e) => {
    const pos = getPointerPos(e)
    lastMouseRef.current = { x: e.clientX || e.touches?.[0]?.clientX || 0, y: e.clientY || e.touches?.[0]?.clientY || 0 }

    if (e.button === 1 || spaceRef.current || activeTool === 'select') {
      setIsPanning(true)
      drawingRef.current = false
      return
    }

    drawingRef.current = true
    setIsDrawing(true)

    if (activeTool === 'eraser') {
      erasePixelsUnder(e)
      return
    }
    if (activeTool === 'laser') {
      setLaserTrails(prev => [...prev, { id: Date.now(), x: pos.x, y: pos.y, time: Date.now() }])
      if (onLivePath) onLivePath({ type: 'laser', points: [pos], color: '#e53e3e', strokeWidth: 3 })
      return
    }
    if (activeTool === 'pen') {
      setCurrentPath([pos])
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
    if (activeTool === 'rect' || activeTool === 'circle' || activeTool === 'line' || activeTool === 'arrow') {
      setShapeStart(pos); setShapePreview(pos)
      return
    }
  }, [activeTool, getPointerPos, onLivePath])

  const erasePixelsUnder = useCallback((e) => {
    const canvas = effectiveCanvasRef.current
    if (!canvas) return
    const pos = getPointerPos(e)
    const ctx = canvas.getContext('2d')
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, strokeWidth * 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }, [getPointerPos, strokeWidth, effectiveCanvasRef])

  const handlePointerMove = useCallback((e) => {
    const pos = getPointerPos(e)

    if (onCursor && !standalone) {
      const now = Date.now()
      if (now - lastLiveEmitRef.current > 50) {
        lastLiveEmitRef.current = now
        const userName = roomUsers?.find?.(u => u.socketId === u.socketId)?.name || 'User'
        onCursor({ x: pos.x, y: pos.y, userName })
      }
    }

    if (isPanning) {
      const dx = e.clientX - lastMouseRef.current.x
      const dy = e.clientY - lastMouseRef.current.y
      lastMouseRef.current = { x: e.clientX, y: e.clientY }
      const newPan = { x: panRef.current.x + dx, y: panRef.current.y + dy }
      panRef.current = newPan
      setPan(newPan)
      return
    }

    if (!drawingRef.current) return

    if (activeTool === 'eraser') { erasePixelsUnder(e); return }

    if (activeTool === 'laser') {
      setLaserTrails(prev => [...prev, { id: Date.now(), x: pos.x, y: pos.y, time: Date.now() }])
      if (onLivePath) onLivePath({ type: 'laser', points: [pos], color: '#e53e3e', strokeWidth: 3 })
      return
    }
    if (activeTool === 'pen') {
      setCurrentPath(prev => [...prev, pos])
      const canvas = effectiveCanvasRef.current
      if (canvas && currentPath.length > 0) {
        const ctx = canvas.getContext('2d')
        ctx.strokeStyle = color
        ctx.lineWidth = strokeWidth
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        const prevPoint = currentPath[currentPath.length - 1]
        ctx.moveTo(prevPoint.x, prevPoint.y)
        ctx.lineTo(pos.x, pos.y)
        ctx.stroke()
      }
      return
    }
    if (shapeStart && ['rect', 'circle', 'line', 'arrow'].includes(activeTool)) {
      setShapePreview(pos)
      return
    }
  }, [isPanning, activeTool, getPointerPos, color, strokeWidth, shapeStart, currentPath, effectiveCanvasRef, onCursor, onLivePath, standalone, roomUsers, erasePixelsUnder])

  const handlePointerUp = useCallback((e) => {
    if (isPanning) { setIsPanning(false); drawingRef.current = false; return }
    if (!drawingRef.current) return
    drawingRef.current = false
    setIsDrawing(false)

    const pos = getPointerPos(e)

    if (activeTool === 'pen' && currentPath.length > 1) {
      onDraw?.({ tool: 'pen', points: currentPath, color, strokeWidth })
      setCurrentPath([])
      return
    }
    if (activeTool === 'pen') setCurrentPath([])

    if (activeTool === 'laser') {
      if (onLivePathEnd) onLivePathEnd()
      return
    }

    if ((activeTool === 'rect' || activeTool === 'circle') && shapeStart) {
      const end = shapePreview || pos
      const x = Math.min(shapeStart.x, end.x), y = Math.min(shapeStart.y, end.y)
      const w = Math.abs(end.x - shapeStart.x) || 100, h = Math.abs(end.y - shapeStart.y) || 100
      if (w > 2 || h > 2) onDraw?.({ tool: activeTool, x, y, w, h, color, strokeWidth })
      setShapeStart(null); setShapePreview(null)
      return
    }
    if ((activeTool === 'line' || activeTool === 'arrow') && shapeStart) {
      const end = shapePreview || pos
      const dx = end.x - shapeStart.x, dy = end.y - shapeStart.y
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        onDraw?.({ tool: activeTool, x1: shapeStart.x, y1: shapeStart.y, x2: end.x, y2: end.y, x: shapeStart.x, y: shapeStart.y, color, strokeWidth })
      }
      setShapeStart(null); setShapePreview(null)
      return
    }

    if (activeTool === 'select' && selectedActionId && dragOffset) {
      setDragOffset(null)
    }
  }, [isPanning, activeTool, currentPath, shapeStart, shapePreview, color, strokeWidth, onDraw, getPointerPos, selectedActionId, dragOffset, onLivePathEnd])

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

  const handleSelectDown = useCallback((e) => {
    if (activeTool !== 'select') return false
    const pos = getPointerPos(e)
    const reversed = [...actions].reverse()
    const hit = reversed.find(a => hitTestPoint(a, pos.x, pos.y))
    if (hit) {
      setSelectedActionId(hit._id || null)
      setDragOffset({ x: pos.x - (hit.x || 0), y: pos.y - (hit.y || 0) })
    } else {
      setSelectedActionId(null)
      setIsPanning(true)
      drawingRef.current = false
    }
    return true
  }, [activeTool, getPointerPos, actions])

  const effectivePointerDown = useCallback((e) => {
    if (activeTool === 'select') {
      const handled = handleSelectDown(e)
      if (handled) return
    }
    handlePointerDown(e)
  }, [activeTool, handleSelectDown, handlePointerDown])

  const cursorStyle = spaceRef.current || isPanning ? 'grab' :
    activeTool === 'eraser' ? 'crosshair' :
    activeTool === 'laser' ? 'crosshair' :
    activeTool === 'text' ? 'text' :
    activeTool === 'select' ? 'default' : 'crosshair'

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
        <div className="absolute z-50" style={{ left: textPos.x * zoom + pan.x, top: textPos.y * zoom + pan.y }}>
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
        <div className="absolute z-50" style={{ left: stickyPos.x * zoom + pan.x, top: stickyPos.y * zoom + pan.y }}>
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
              left: trail.x * zoom + pan.x - 5,
              top: trail.y * zoom + pan.y - 5,
              width: 10, height: 10,
              backgroundColor: '#e53e3e',
              opacity: 1 - progress,
              boxShadow: '0 0 6px 2px rgba(229,62,62,0.4)',
            }}
          />
        )
      })}

      <div className="flex-1 relative overflow-hidden" style={{ cursor: cursorStyle }}>
        <canvas
          ref={effectiveCanvasRef}
          onMouseDown={effectivePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={() => { drawingRef.current = false; setIsDrawing(false); setIsPanning(false) }}
          onTouchStart={effectivePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          className="absolute inset-0 w-full h-full touch-none"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
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
              className={`w-4.5 h-4.5 rounded-full border transition-all ${
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

        <button onClick={handleZoomOut} title="Zoom Out (Ctrl+-)"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors">
          <Minus size={13} />
        </button>
        <span className="text-[10px] text-white/60 font-mono min-w-[36px] text-center select-none">
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={handleZoomIn} title="Zoom In (Ctrl+=)"
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