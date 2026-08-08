import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MousePointer2,
  Pencil,
  Type,
  StickyNote,
  Circle,
  Square,
  Eraser,
  Minus,
  Plus,
  Maximize,
  Trash2,
  Undo2,
  Users,
  MessageCircle,
  FileText,
  Upload,
  Send,
  ChevronLeft,
  ChevronRight,
  Timer,
  Video,
  UserPlus,
} from 'lucide-react';

const COLORS = ['#1f1b11', '#745c26', '#264aea', '#ba1a1a', '#386a20', '#e87d1e', '#9840b5'];
const STROKE_WIDTHS = [2, 4, 6, 10];

const tools = [
  { id: 'select', icon: MousePointer2, label: 'Select' },
  { id: 'pen', icon: Pencil, label: 'Pen' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'sticky', icon: StickyNote, label: 'Sticky' },
  { id: 'rect', icon: Square, label: 'Rectangle' },
  { id: 'circle', icon: Circle, label: 'Circle' },
  { id: 'eraser', icon: Eraser, label: 'Eraser' },
];

export default function Whiteboard({
  roomId,
  connected,
  roomUsers,
  remoteCursors,
  actions = [],
  onDraw,
  onCursor,
  onClear,
  onUndo,
  onLivePath,
  onLivePathEnd,
  onLeave,
  onToggleChat,
  chatOpen,
  fullScreen,
  onToggleFullScreen,
  livePaths = [],
  boardName,
  standalone,
  canvasRef: externalCanvasRef,
  pomodoroOpen,
  onTogglePomodoro,
  recorderOpen,
  onToggleRecorder,
  recording,
  panelTab,
  onTogglePanel,
  fileCount,
  filePreviewOpen,
  onToggleFilePreview,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const textInputRef = useRef(null);

  const [activeTool, setActiveTool] = useState('pen');
  const [color, setColor] = useState('#1f1b11');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showStrokePicker, setShowStrokePicker] = useState(false);
  const [stickyText, setStickyText] = useState('');
  const [showStickyInput, setShowStickyInput] = useState(false);
  const [stickyPos, setStickyPos] = useState({ x: 0, y: 0 });
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPos, setTextPos] = useState({ x: 0, y: 0 });

  const panRef = useRef({ x: 0, y: 0 });
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const spaceRef = useRef(false);
  const drawingRef = useRef(false);
  const lastLiveEmitRef = useRef(0);

  // Combine local + remote actions + live paths
  const allActions = [...actions, ...livePaths];

  const CANVAS_TOP_OFFSET = 40

  // Screen to canvas coords
  const screenToCanvas = useCallback((sx, sy) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (sx - rect.left - pan.x) / zoom,
      y: (sy - rect.top - CANVAS_TOP_OFFSET - pan.y) / zoom,
    };
  }, [pan, zoom]);

  // Canvas to screen coords
  const canvasToScreen = useCallback((cx, cy) => ({
    x: cx * zoom + pan.x,
    y: cy * zoom + pan.y,
  }), [pan, zoom]);

  // Draw grid
  const drawGrid = useCallback((ctx, w, h) => {
    const gridSize = 24 * zoom;
    const offsetX = pan.x % gridSize;
    const offsetY = pan.y % gridSize;
    ctx.fillStyle = '#d1c5ac';
    for (let x = offsetX; x < w; x += gridSize) {
      for (let y = offsetY; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.5, zoom * 0.8), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [pan, zoom]);

  // Draw all actions on canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw all actions
    for (const action of allActions) {
      drawAction(ctx, action);
    }

    // Draw current path being drawn
    if (isDrawing && currentPath.length > 0 && activeTool === 'pen') {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y);
      }
      ctx.stroke();
    }

    // Live eraser preview while dragging
    if (isDrawing && currentPath.length > 0 && activeTool === 'eraser') {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = strokeWidth * 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }, [allActions, pan, zoom, isDrawing, currentPath, activeTool, color, strokeWidth, drawGrid]);

  function drawAction(ctx, action) {
    if (action.type === 'pen' && action.points?.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = action.color || '#000';
      ctx.lineWidth = action.strokeWidth || 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(action.points[0].x, action.points[0].y);
      for (let i = 1; i < action.points.length; i++) {
        ctx.lineTo(action.points[i].x, action.points[i].y);
      }
      ctx.stroke();
    }

    if (action.type === 'eraser' && action.points?.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = (action.strokeWidth || 2) * 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(action.points[0].x, action.points[0].y);
      for (let i = 1; i < action.points.length; i++) {
        ctx.lineTo(action.points[i].x, action.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    if (action.type === 'rect') {
      ctx.strokeStyle = action.color || '#000';
      ctx.lineWidth = action.strokeWidth || 2;
      ctx.strokeRect(action.x, action.y, action.w, action.h);
    }

    if (action.type === 'circle') {
      ctx.beginPath();
      ctx.strokeStyle = action.color || '#000';
      ctx.lineWidth = action.strokeWidth || 2;
      const rx = Math.abs(action.w) / 2;
      const ry = Math.abs(action.h) / 2;
      const cx = action.x + action.w / 2;
      const cy = action.y + action.h / 2;
      ctx.ellipse(cx, cy, rx || 1, ry || 1, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (action.type === 'text' && action.text) {
      ctx.fillStyle = action.color || '#1f1b11';
      ctx.font = `${(action.strokeWidth || 2) * 8}px Inter, sans-serif`;
      ctx.fillText(action.text, action.x, action.y);
    }

    if (action.type === 'sticky' && action.text) {
      const w = 200;
      const h = Math.max(100, action.text.length / 2.5 + 40);
      ctx.fillStyle = action.fill || '#ffd02f';
      ctx.beginPath();
      roundRect(ctx, action.x, action.y, w, h, 12);
      ctx.fill();
      ctx.fillStyle = '#1f1b11';
      ctx.font = '13px Inter, sans-serif';
      wrapText(ctx, action.text, action.x + 16, action.y + 32, w - 32, 20);
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let cy = y;
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line.trim(), x, cy);
        line = word + ' ';
        cy += lineHeight;
      } else {
        line = test;
      }
    }
    ctx.fillText(line.trim(), x, cy);
  }

  // Animation loop (stable - uses latest render fn via ref, never dies)
  const renderCanvasRef = useRef(renderCanvas);
  useEffect(() => {
    renderCanvasRef.current = renderCanvas;
  });
  useEffect(() => {
    let raf;
    const loop = () => {
      renderCanvasRef.current();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Keyboard events
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat) {
        spaceRef.current = true;
        e.preventDefault();
      }
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space') spaceRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Mouse events
  const handleMouseDown = (e) => {
    if (e.button === 1 || spaceRef.current || activeTool === 'select') {
      setIsPanning(true);
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      panRef.current = { ...pan };
      return;
    }

    if (activeTool === 'sticky') {
      const pos = screenToCanvas(e.clientX, e.clientY);
      setStickyPos(pos);
      setShowStickyInput(true);
      setStickyText('');
      return;
    }

    if (activeTool === 'text') {
      const pos = screenToCanvas(e.clientX, e.clientY);
      setTextPos(pos);
      setShowTextInput(true);
      setTextInput('');
      return;
    }

    if (activeTool === 'pen' || activeTool === 'eraser') {
      drawingRef.current = true;
      setIsDrawing(true);
      const pos = screenToCanvas(e.clientX, e.clientY);
      setCurrentPath([pos]);
    }

    if (activeTool === 'rect' || activeTool === 'circle') {
      drawingRef.current = true;
      setIsDrawing(true);
      const pos = screenToCanvas(e.clientX, e.clientY);
      setCurrentPath([pos, pos]);
    }
  };

  const handleMouseMove = (e) => {
    // Emit cursor position
    const pos = screenToCanvas(e.clientX, e.clientY);
    onCursor?.(pos.x, pos.y);

    if (isPanning) {
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      setPan({ x: panRef.current.x + dx, y: panRef.current.y + dy });
      return;
    }

    if (drawingRef.current) {
      if (activeTool === 'pen' || activeTool === 'eraser') {
        const pos = screenToCanvas(e.clientX, e.clientY);
        setCurrentPath((prev) => {
          const next = [...prev, pos];
          const now = Date.now();
          if (now - lastLiveEmitRef.current > 60 && next.length > 2) {
            lastLiveEmitRef.current = now;
            onLivePath?.({
              type: activeTool,
              points: next,
              color: activeTool === 'eraser' ? '#fff8f0' : color,
              strokeWidth,
            });
          }
          return next;
        });
      }
      if (activeTool === 'rect' || activeTool === 'circle') {
        const pos = screenToCanvas(e.clientX, e.clientY);
        setCurrentPath((prev) => [prev[0], pos]);
      }
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (drawingRef.current) {
      drawingRef.current = false;
      setIsDrawing(false);
      onLivePathEnd?.();

      if ((activeTool === 'pen' || activeTool === 'eraser') && currentPath.length > 1) {
        const action = {
          type: activeTool,
          points: currentPath,
          color: activeTool === 'eraser' ? '#fff8f0' : color,
          strokeWidth,
        };
        onDraw?.(action);
      }

      if (activeTool === 'rect' && currentPath.length === 2) {
        const [start, end] = currentPath;
        onDraw?.({
          type: 'rect',
          x: start.x,
          y: start.y,
          w: end.x - start.x,
          h: end.y - start.y,
          color,
          strokeWidth,
        });
      }

      if (activeTool === 'circle' && currentPath.length === 2) {
        const [start, end] = currentPath;
        onDraw?.({
          type: 'circle',
          x: start.x,
          y: start.y,
          w: end.x - start.x,
          h: end.y - start.y,
          color,
          strokeWidth,
        });
      }

      setCurrentPath([]);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    const newZoom = Math.min(Math.max(zoom + delta, 0.1), 5);

    const rect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const scale = newZoom / zoom;
    setPan({
      x: mx - scale * (mx - pan.x),
      y: my - scale * (my - pan.y),
    });
    setZoom(newZoom);
  };

  const handleStickySubmit = () => {
    if (stickyText.trim()) {
      onDraw?.({
        type: 'sticky',
        x: stickyPos.x,
        y: stickyPos.y,
        text: stickyText.trim(),
        fill: color === '#1f1b11' ? '#ffd02f' : color,
      });
    }
    setShowStickyInput(false);
    setStickyText('');
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      onDraw?.({
        type: 'text',
        x: textPos.x,
        y: textPos.y,
        text: textInput.trim(),
        color,
        strokeWidth,
      });
    }
    setShowTextInput(false);
    setTextInput('');
  };

  const zoomIn = () => setZoom((z) => Math.min(z + 0.2, 5));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.1));
  const zoomReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const getCursorStyle = () => {
    if (isPanning || spaceRef.current) return 'grabbing';
    if (activeTool === 'pen' || activeTool === 'eraser') return 'crosshair';
    if (activeTool === 'select') return 'grab';
    return 'default';
  };

  return (
    <div className="flex h-full w-full">
      {/* Left toolbar */}
      <div className="w-14 bg-surface-container-low border-r border-outline-variant/30 flex flex-col items-center py-3 gap-1 shrink-0 z-20">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const active = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              title={tool.label}
              className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 ${
                active
                  ? 'bg-primary-container text-on-primary-container'
                  : 'text-on-surface/45 hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              {active && (
                <motion.div
                  layoutId="wb-tool"
                  className="absolute inset-0 bg-primary-container rounded-xl"
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                />
              )}
              <Icon size={18} className="relative z-10" />
            </button>
          );
        })}

        {/* Color picker trigger */}
        <div className="relative mt-2">
          <button
            onClick={() => { setShowColorPicker(!showColorPicker); setShowStrokePicker(false); }}
            className="w-8 h-8 rounded-full border-2 border-outline-variant/40 hover:scale-110 transition-transform"
            style={{ backgroundColor: color }}
            title="Color"
          />
          <AnimatePresence>
            {showColorPicker && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="absolute left-12 top-0 bg-surface-container-low border border-outline-variant/30 rounded-xl p-2 flex gap-1.5 flex-col z-50 shadow-lg"
              >
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => { setColor(c); setShowColorPicker(false); }}
                    className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                      color === c ? 'border-on-surface scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Stroke width trigger */}
        <div className="relative">
          <button
            onClick={() => { setShowStrokePicker(!showStrokePicker); setShowColorPicker(false); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface/50 hover:bg-surface-container transition-colors"
            title="Stroke width"
          >
            <div className="rounded-full bg-on-surface" style={{ width: strokeWidth + 4, height: strokeWidth + 4 }} />
          </button>
          <AnimatePresence>
            {showStrokePicker && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="absolute left-12 top-0 bg-surface-container-low border border-outline-variant/30 rounded-xl p-2 flex flex-col gap-2 z-50 shadow-lg"
              >
                {STROKE_WIDTHS.map((sw) => (
                  <button
                    key={sw}
                    onClick={() => { setStrokeWidth(sw); setShowStrokePicker(false); }}
                    className={`w-10 h-6 rounded-lg flex items-center justify-center transition-colors ${
                      strokeWidth === sw ? 'bg-primary-container' : 'hover:bg-surface-container'
                    }`}
                  >
                    <div className="rounded-full bg-on-surface" style={{ width: sw + 4, height: sw + 4 }} />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1" />

        <div className="border-t border-outline-variant/20 pt-2 w-10 flex flex-col items-center gap-1">
          <button
            onClick={onTogglePomodoro}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors relative ${
              pomodoroOpen
                ? 'bg-primary-container text-on-primary-container'
                : 'text-on-surface/40 hover:bg-surface-container hover:text-on-surface'
            }`}
            title="Pomodoro Timer"
          >
            <Timer size={16} />
          </button>

          <button
            onClick={onToggleRecorder}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors relative ${
              recorderOpen
                ? 'bg-error/10 text-error'
                : 'text-on-surface/40 hover:bg-surface-container hover:text-on-surface'
            }`}
            title="Screen Recording"
          >
            <Video size={16} />
            {recording && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-error animate-pulse" />
            )}
          </button>

          <button
            onClick={onTogglePanel ? () => onTogglePanel('chat') : onToggleChat}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors relative ${
              panelTab === 'chat' || chatOpen
                ? 'bg-primary-container text-on-primary-container'
                : 'text-on-surface/40 hover:bg-surface-container hover:text-on-surface'
            }`}
            title="Chat"
          >
            <MessageCircle size={16} />
          </button>

          <button
            onClick={onTogglePanel ? () => onTogglePanel('members') : undefined}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors relative ${
              panelTab === 'members'
                ? 'bg-primary-container text-on-primary-container'
                : 'text-on-surface/40 hover:bg-surface-container hover:text-on-surface'
            }`}
            title="Members"
          >
            <Users size={16} />
          </button>

          <button
            onClick={onTogglePanel ? () => onTogglePanel('files') : onToggleFilePreview}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors relative ${
              panelTab === 'files' || filePreviewOpen
                ? 'bg-primary-container text-on-primary-container'
                : 'text-on-surface/40 hover:bg-surface-container hover:text-on-surface'
            }`}
            title="Shared Files"
          >
            <FileText size={16} />
            {fileCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-primary text-on-primary text-[9px] font-bold flex items-center justify-center px-1">
                {fileCount}
              </span>
            )}
          </button>

          <button
            onClick={onTogglePanel ? () => onTogglePanel('invite') : undefined}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors relative ${
              panelTab === 'invite'
                ? 'bg-primary-container text-on-primary-container'
                : 'text-on-surface/40 hover:bg-surface-container hover:text-on-surface'
            }`}
            title="Invite"
          >
            <UserPlus size={16} />
          </button>
        </div>

        <div className="border-t border-outline-variant/20 pt-2 w-10 flex flex-col items-center gap-1">
          {roomUsers.slice(0, 5).map((u, i) => (
            <div
              key={u._id || i}
              className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-[10px] font-bold text-on-secondary-container ring-2 ring-surface-container-low"
              title={u.name}
            >
              {u.name?.charAt(0)?.toUpperCase()}
            </div>
          ))}
        </div>

        <button
          onClick={onToggleFullScreen}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface/40 hover:bg-surface-container hover:text-on-surface transition-colors mt-2"
          title={fullScreen ? 'Exit full screen' : 'Full screen'}
        >
          {fullScreen ? <Maximize size={16} className="rotate-90" /> : <Maximize size={16} />}
        </button>

        <button
          onClick={onClear}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface/30 hover:bg-error-container hover:text-error transition-colors mt-1"
          title="Clear board"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Main canvas */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{ cursor: getCursorStyle(), touchAction: 'none' }}
        onPointerDown={handleMouseDown}
        onPointerMove={handleMouseMove}
        onPointerUp={handleMouseUp}
        onPointerLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Breadcrumb */}
        <div className="absolute top-0 left-0 right-0 h-10 bg-surface/80 backdrop-blur-sm border-b border-outline-variant/20 flex items-center px-4 text-xs text-on-surface/50 z-10 gap-2">
          <span className="text-on-surface font-medium">{boardName || 'Room'}</span>
          {actions.length > 0 && (
            <>
              <div className="w-px h-4 bg-outline-variant/30" />
              <span>{actions.length} element{actions.length !== 1 ? 's' : ''}</span>
            </>
          )}
          <div className="flex-1" />
          {standalone ? (
            <>
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Autosaved</span>
            </>
          ) : (
            <>
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-error'}`} />
              <span>{connected ? 'Connected' : 'Connecting...'}</span>
              <div className="w-px h-4 bg-outline-variant/30 mx-1" />
              <Users size={14} />
              <span>{roomUsers.length} online</span>
            </>
          )}
        </div>

        {/* Canvas */}
        <canvas
          ref={(node) => {
            canvasRef.current = node;
            if (externalCanvasRef) externalCanvasRef.current = node;
          }}
          className="absolute inset-0 top-10"
          style={{ touchAction: 'none' }}
        />

        {/* Remote cursors */}
        {Object.entries(remoteCursors).map(([id, cursor]) => (
          <motion.div
            key={id}
            className="absolute pointer-events-none z-20"
            animate={{ left: cursor.x * zoom + pan.x, top: cursor.y * zoom + pan.y + 40 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <MousePointer2 size={16} className="text-secondary -rotate-12" fill="currentColor" />
            <span className="ml-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-[9px] font-semibold text-white">
              {cursor.name?.split(' ')[0]}
            </span>
          </motion.div>
        ))}

        {/* Sticky note input */}
        <AnimatePresence>
          {showStickyInput && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute z-30 bg-primary-container rounded-2xl p-4 shadow-xl w-56"
              style={{
                left: stickyPos.x * zoom + pan.x,
                top: stickyPos.y * zoom + pan.y + 40,
              }}
            >
              <textarea
                autoFocus
                value={stickyText}
                onChange={(e) => setStickyText(e.target.value)}
                placeholder="Type your note..."
                className="w-full h-24 bg-transparent text-sm text-on-primary-container placeholder:text-on-primary-container/40 outline-none resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleStickySubmit(); }
                  if (e.key === 'Escape') setShowStickyInput(false);
                }}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => setShowStickyInput(false)} className="text-xs text-on-primary-container/50 px-2 py-1">Cancel</button>
                <button onClick={handleStickySubmit} className="text-xs font-semibold text-on-primary-container bg-surface/30 px-3 py-1 rounded-lg hover:bg-surface/50">Add</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text input */}
        <AnimatePresence>
          {showTextInput && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute z-30 bg-surface-container-low border border-outline-variant/30 rounded-xl p-3 shadow-xl"
              style={{
                left: textPos.x * zoom + pan.x,
                top: textPos.y * zoom + pan.y + 40,
              }}
            >
              <input
                autoFocus
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type text..."
                className="w-64 bg-transparent text-sm text-on-surface placeholder:text-on-surface/30 outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTextSubmit();
                  if (e.key === 'Escape') setShowTextInput(false);
                }}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => setShowTextInput(false)} className="text-xs text-on-surface/50 px-2 py-1">Cancel</button>
                <button onClick={handleTextSubmit} className="text-xs font-semibold text-on-primary bg-primary px-3 py-1 rounded-lg hover:opacity-90">Add</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Zoom controls */}
        <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-surface-container-low border border-outline-variant/30 rounded-xl px-1 py-1 z-10">
          <button onClick={zoomOut} className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface/50 hover:bg-surface-container transition-colors">
            <Minus size={14} />
          </button>
          <button onClick={zoomReset} className="w-12 h-8 rounded-lg flex items-center justify-center text-xs font-medium text-on-surface/60 hover:bg-surface-container transition-colors">
            {Math.round(zoom * 100)}%
          </button>
          <button onClick={zoomIn} className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface/50 hover:bg-surface-container transition-colors">
            <Plus size={14} />
          </button>
          <div className="w-px h-5 bg-outline-variant/30 mx-0.5" />
          <button onClick={zoomReset} className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface/50 hover:bg-surface-container transition-colors">
            <Maximize size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
