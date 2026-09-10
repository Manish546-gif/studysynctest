import React, { useState, useEffect, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'
import api from '../services/api'
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Highlighter,
  MessageSquare,
  UploadCloud,
  X,
  Crown,
  Loader2,
} from 'lucide-react'

// Configure PDF.js to use local bundled worker with zero CDN network delay
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker
}

const PdfPageItem = React.memo(function PdfPageItem({
  doc,
  pageNumber,
  scale,
  activeTool,
  highlights = [],
  notes = [],
  onCanvasClick,
  onVisible,
}) {
  const canvasRef = useRef(null)
  const itemRef = useRef(null)
  const [rendered, setRendered] = useState(pageNumber <= 3)
  const [pageDims, setPageDims] = useState({ width: 640, height: 860 })
  const [pageLoading, setPageLoading] = useState(false)
  const renderTaskRef = useRef(null)
  const onVisibleRef = useRef(onVisible)
  onVisibleRef.current = onVisible

  // IntersectionObserver to lazily trigger render and track current page
  useEffect(() => {
    if (!itemRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setRendered(true)
            if (entry.intersectionRatio >= 0.5) {
              onVisibleRef.current?.(pageNumber)
            }
          }
        })
      },
      { rootMargin: '400px 0px 400px 0px', threshold: [0.1, 0.5] }
    )
    observer.observe(itemRef.current)
    return () => observer.disconnect()
  }, [pageNumber])

  // Render this specific page onto its canvas
  useEffect(() => {
    if (!doc || !rendered || !canvasRef.current) return
    let isMounted = true

    const render = async () => {
      if (renderTaskRef.current) {
        try {
          await renderTaskRef.current.cancel()
        } catch {}
      }

      try {
        setPageLoading(true)
        const page = await doc.getPage(pageNumber)
        if (!isMounted || !canvasRef.current) return

        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d', { alpha: false })
        const viewport = page.getViewport({ scale })

        const targetW = Math.floor(viewport.width)
        const targetH = Math.floor(viewport.height)
        setPageDims({ width: targetW, height: targetH })

        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        canvas.width = Math.floor(targetW * dpr)
        canvas.height = Math.floor(targetH * dpr)
        canvas.style.width = `${targetW}px`
        canvas.style.height = `${targetH}px`

        const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null
        const renderContext = {
          canvasContext: ctx,
          viewport,
          ...(transform ? { transform } : {}),
        }

        const task = page.render(renderContext)
        renderTaskRef.current = task
        await task.promise
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn(`Page ${pageNumber} render error:`, err)
        }
      } finally {
        if (isMounted) {
          setPageLoading(false)
          renderTaskRef.current = null
        }
      }
    }

    render()

    return () => {
      isMounted = false
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel()
        } catch {}
      }
    }
  }, [doc, pageNumber, scale, rendered])

  return (
    <div
      ref={itemRef}
      className="relative shadow-2xl rounded-xl overflow-hidden border border-[#2a2d33] bg-[#14171f] transition-all my-2"
      style={{
        width: `${pageDims.width}px`,
        minHeight: `${pageDims.height}px`,
      }}
    >
      {pageLoading && (
        <div className="absolute top-3 right-3 z-10 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-white/10 shadow-lg pointer-events-none">
          <Loader2 size={12} className="animate-spin text-[#53fc18]" />
          <span className="text-[10px] font-medium text-white/80">Page {pageNumber}…</span>
        </div>
      )}

      <canvas
        ref={canvasRef}
        onClick={(e) => onCanvasClick?.(e, pageNumber, canvasRef.current)}
        className="block bg-white cursor-pointer"
      />

      {/* Synchronized Highlights for this page */}
      {highlights
        .filter((h) => h.pageNumber === pageNumber)
        .map((h, i) => (
          <div
            key={h.id || i}
            className="absolute pointer-events-none mix-blend-multiply opacity-60 rounded-xs"
            style={{
              left: `${h.x * 100}%`,
              top: `${h.y * 100}%`,
              width: `${(h.width || 0.25) * 100}%`,
              height: `${(h.height || 0.03) * 100}%`,
              backgroundColor: h.color || '#fef08a',
            }}
            title={`Highlighted by ${h.by || 'Member'}`}
          />
        ))}

      {/* Synchronized Margin Notes for this page */}
      {notes
        .filter((n) => n.pageNumber === pageNumber)
        .map((n, i) => (
          <div
            key={n.id || i}
            className="absolute z-20 group -translate-x-1/2 -translate-y-1/2 cursor-pointer"
            style={{ left: `${n.x * 100}%`, top: `${n.y * 100}%` }}
          >
            <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg text-[10px] font-bold border border-white/50">
              <MessageSquare size={10} />
            </div>
            <div className="absolute left-6 top-0 hidden group-hover:block w-48 p-2 rounded-xl bg-[#141720] border border-white/15 text-white shadow-2xl text-[10px] z-30 pointer-events-none">
              <p className="font-bold text-blue-400 mb-0.5">{n.author || 'Study Partner'}</p>
              <p className="text-white/80 leading-snug">{n.text}</p>
            </div>
          </div>
        ))}
    </div>
  )
})

export default function PdfCoReaderPanel({
  isOpen,
  onClose,
  initialFile = null,
  socket,
  roomId,
  isHost,
  currentUser,
  roomFiles = [],
}) {
  const [pdfDoc, setPdfDoc] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(1.15)
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState('')
  const [fileUrl, setFileUrl] = useState('')

  // Collaboration State
  const [followPresenter, setFollowPresenter] = useState(true)
  const [presenterName, setPresenterName] = useState('')
  const [presenterId, setPresenterId] = useState(null)
  const [isPresenter, setIsPresenter] = useState(false)

  // Tools: 'view' | 'highlight' | 'note'
  const [activeTool, setActiveTool] = useState('view')
  const [highlightColor] = useState('#fef08a')
  const [highlights, setHighlights] = useState([])
  const [notes, setNotes] = useState([])
  const [newNoteText, setNewNoteText] = useState('')
  const [noteCoords, setNoteCoords] = useState(null)

  const containerRef = useRef(null)

  // Auto-load initial file if passed directly from workspace
  useEffect(() => {
    if (initialFile && isOpen) {
      const token = localStorage.getItem('token')
      const url = initialFile.url || ''
      const remoteUrl = url.startsWith('http')
        ? url
        : `${url}${url.includes('?') ? '&' : '?'}token=${token}`
      setFileName(initialFile.fileName || 'Document.pdf')
      setFileUrl(remoteUrl)
    }
  }, [initialFile, isOpen])

  const scrollToPage = (pageNum) => {
    const el = document.getElementById(`pdf-page-${pageNum}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // 1. Initial State Sync via Socket
  useEffect(() => {
    if (!socket || !roomId || !isOpen) return

    socket.emit('pdf-get-state', { roomId })

    const onPdfState = (state) => {
      if (state && state.fileUrl) {
        setFileUrl(state.fileUrl)
        setFileName(state.fileName || 'Document.pdf')
        if (state.pageCount) {
          setNumPages((prev) => (prev > state.pageCount ? prev : state.pageCount))
        }
        if (state.currentPage) {
          setCurrentPage(state.currentPage)
        }
        setPresenterName(state.presenterName || '')
        setPresenterId(state.presenterId || null)
        if (state.highlights) setHighlights(state.highlights)
        if (state.notes) setNotes(state.notes)
      }
    }

    const onPageSync = ({ currentPage: syncPage, presenterId: pId, presenterName: pName }) => {
      setPresenterId(pId)
      setPresenterName(pName)
      if (followPresenter) {
        setCurrentPage(syncPage)
        scrollToPage(syncPage)
      }
    }

    const onHighlightAdded = (item) => {
      setHighlights((prev) => [...prev, item])
    }

    const onNoteAdded = (item) => {
      setNotes((prev) => [...prev, item])
    }

    socket.on('pdf-state', onPdfState)
    socket.on('pdf-page-sync', onPageSync)
    socket.on('pdf-highlight-added', onHighlightAdded)
    socket.on('pdf-note-added', onNoteAdded)

    return () => {
      socket.off('pdf-state', onPdfState)
      socket.off('pdf-page-sync', onPageSync)
      socket.off('pdf-highlight-added', onHighlightAdded)
      socket.off('pdf-note-added', onNoteAdded)
    }
  }, [socket, roomId, isOpen, followPresenter])

  // Track if current user is presenter
  useEffect(() => {
    if (currentUser?._id && presenterId) {
      setIsPresenter(String(currentUser._id) === String(presenterId))
    } else if (isHost) {
      setIsPresenter(true)
    }
  }, [currentUser, presenterId, isHost])

  // 2. Load PDF Document when fileUrl changes
  useEffect(() => {
    if (!fileUrl) return
    let isMounted = true
    setLoading(true)

    const loadingTask = pdfjsLib.getDocument({
      url: fileUrl,
      withCredentials: false,
    })

    loadingTask.promise
      .then((doc) => {
        if (isMounted) {
          setPdfDoc(doc)
          const total = doc.numPages || 1
          setNumPages(total)
          setCurrentPage(1)
          setLoading(false)
          if (socket && roomId && total > 1) {
            socket.emit('pdf-update-page-count', { roomId, pageCount: total })
          }
        }
      })
      .catch((err) => {
        console.warn('PDF load error:', err.message)
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [fileUrl, socket, roomId])

  // Stable callback when page enters view via scroll
  const handlePageVisible = React.useCallback(
    (p) => {
      setCurrentPage((prev) => {
        if (prev === p) return prev
        if (isPresenter && socket && roomId) {
          socket.emit('pdf-page-change', { roomId, pageNumber: p })
        }
        return p
      })
    },
    [isPresenter, socket, roomId]
  )

  // Change page button click
  const handlePageChange = (newPage) => {
    const target = Math.max(1, Math.min(numPages, newPage))
    if (target === currentPage) return
    setCurrentPage(target)
    scrollToPage(target)

    if (isPresenter && socket && roomId) {
      socket.emit('pdf-page-change', {
        roomId,
        pageNumber: target,
      })
    }
  }

  // Keyboard navigation for PDF
  useEffect(() => {
    if (!isOpen || !pdfDoc) return
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault()
        if (currentPage < numPages) handlePageChange(currentPage + 1)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        if (currentPage > 1) handlePageChange(currentPage - 1)
      } else if (e.key === '+' || e.key === '=') {
        setScale((s) => Math.min(2.5, s + 0.15))
      } else if (e.key === '-' || e.key === '_') {
        setScale((s) => Math.max(0.6, s - 0.15))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, pdfDoc, currentPage, numPages])

  if (!isOpen) return null

  // Handle PDF file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const localUrl = URL.createObjectURL(file)
    setFileName(file.name)
    setFileUrl(localUrl)

    try {
      if (roomId) {
        const { file: saved } = await api.uploadRoomFile(roomId, file)
        const token = localStorage.getItem('token')
        const baseUrl = (import.meta.env.VITE_API_URL || '') + saved.url
        const remoteUrl = baseUrl + (baseUrl.includes('?') ? '&' : '?') + `token=${token}`
        setFileUrl(remoteUrl)
        if (socket) {
          socket.emit('pdf-open', {
            roomId,
            fileUrl: remoteUrl,
            fileName: saved.fileName || file.name,
          })
          socket.emit('file-uploaded', saved)
        }
        return
      }
    } catch (err) {
      console.warn('File upload to server failed, using local view:', err.message)
    }

    if (socket && roomId) {
      socket.emit('pdf-open', {
        roomId,
        fileUrl: localUrl,
        fileName: file.name,
      })
    }
  }

  const roomPdfFiles = (roomFiles || []).filter(
    (f) => f.mimeType === 'application/pdf' || f.fileName?.toLowerCase().endsWith('.pdf')
  )

  const openRoomPdf = (file) => {
    const token = localStorage.getItem('token')
    const baseUrl = (import.meta.env.VITE_API_URL || '') + file.url
    const remoteUrl = baseUrl + (baseUrl.includes('?') ? '&' : '?') + `token=${token}`
    setFileName(file.fileName)
    setFileUrl(remoteUrl)
    if (socket && roomId) {
      socket.emit('pdf-open', {
        roomId,
        fileUrl: remoteUrl,
        fileName: file.fileName,
      })
    }
  }

  // Canvas Click for Highlighting or Adding Note
  const handleCanvasClick = (e, pageNum, canvasEl) => {
    if (!canvasEl) return
    const rect = canvasEl.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height

    if (activeTool === 'note') {
      setNoteCoords({ x, y, pageNumber: pageNum })
    } else if (activeTool === 'highlight') {
      const newHighlight = {
        pageNumber: pageNum,
        x,
        y,
        width: 0.25,
        height: 0.028,
        color: highlightColor,
      }
      setHighlights((prev) => [...prev, newHighlight])
      if (socket && roomId) {
        socket.emit('pdf-highlight', { roomId, highlight: newHighlight })
      }
    }
  }

  const submitNote = (e) => {
    e.preventDefault()
    if (!newNoteText.trim() || !noteCoords) return
    const note = {
      pageNumber: noteCoords.pageNumber || currentPage,
      x: noteCoords.x,
      y: noteCoords.y,
      text: newNoteText.trim(),
    }
    setNotes((prev) => [...prev, { ...note, author: currentUser?.name || 'You', createdAt: Date.now() }])
    if (socket && roomId) {
      socket.emit('pdf-note', { roomId, note })
    }
    setNewNoteText('')
    setNoteCoords(null)
    setActiveTool('view')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
      {/* Top Navigation / Control Bar */}
      <div className="h-14 bg-[#0e1117] border-b border-white/10 px-4 flex items-center justify-between shrink-0 shadow-lg text-white">
        {/* Left: Document Info & Presenter Badge */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#53fc18]/15 border border-[#53fc18]/30 flex items-center justify-center text-[#53fc18] shrink-0">
            <FileText size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate max-w-[200px] sm:max-w-xs">
              {fileName || 'Co-Reader (No PDF Loaded)'}
            </p>
            <div className="flex items-center gap-2 text-[10px] text-white/50">
              {presenterName && (
                <span className="flex items-center gap-1 text-[#53fc18] font-semibold">
                  <Crown size={10} />
                  Presenter: {presenterName}
                </span>
              )}
              {numPages > 0 && <span>• {numPages} pages</span>}
            </div>
          </div>
        </div>

        {/* Center: Page Controls & Sync Toggle */}
        <div className="flex items-center gap-2 bg-[#161a22] px-3 py-1.5 rounded-xl border border-white/10">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="text-xs font-mono text-white/80 px-1">
            <span className="text-white font-bold">{currentPage}</span> / {numPages || 1}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= numPages}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={16} />
          </button>

          <div className="w-px h-4 bg-white/10 mx-1" />

          {/* Follow / Presenter Toggle */}
          {isPresenter ? (
            <span className="text-[10px] bg-[#53fc18]/15 text-[#53fc18] px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border border-[#53fc18]/30">
              <Crown size={10} /> Presenting
            </span>
          ) : (
            <button
              onClick={() => setFollowPresenter((f) => !f)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors ${
                followPresenter
                  ? 'bg-[#53fc18]/15 text-[#53fc18] border border-[#53fc18]/30'
                  : 'bg-white/5 text-white/40 hover:text-white'
              }`}
            >
              {followPresenter ? 'Following Presenter' : 'Independent View'}
            </button>
          )}
        </div>

        {/* Right: Tools, Zoom & Close */}
        <div className="flex items-center gap-2">
          {/* Tool Selector */}
          <div className="flex items-center bg-[#161a22] p-0.5 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveTool('view')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                activeTool === 'view' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'
              }`}
            >
              Pan / Scroll
            </button>
            <button
              onClick={() => setActiveTool('highlight')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                activeTool === 'highlight'
                  ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/40'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              <Highlighter size={11} />
              Highlight
            </button>
            <button
              onClick={() => setActiveTool('note')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                activeTool === 'note'
                  ? 'bg-blue-400/20 text-blue-300 border border-blue-400/40'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              <MessageSquare size={11} />
              Sticky Note
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center bg-[#161a22] rounded-xl border border-white/10 p-0.5">
            <button
              onClick={() => setScale((s) => Math.max(0.6, s - 0.15))}
              className="w-7 h-7 flex items-center justify-center text-white/60 hover:text-white"
              title="Zoom out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[10px] font-mono text-white/50 w-9 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}
              className="w-7 h-7 flex items-center justify-center text-white/60 hover:text-white"
              title="Zoom in"
            >
              <ZoomIn size={13} />
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 flex items-center justify-center border border-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Main Canvas / Multi-Page Continuous Viewer Workspace */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-auto bg-[#0a0c10] p-6 relative custom-scrollbar flex flex-col items-center"
      >
        {!fileUrl ? (
          // Empty State / Upload Screen
          <div className="max-w-md w-full my-auto text-center p-8 rounded-3xl bg-[#12151c] border border-white/10 shadow-2xl flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-[#53fc18]/10 border border-[#53fc18]/25 text-[#53fc18] flex items-center justify-center mb-4 shadow-lg">
              <UploadCloud size={32} />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Upload Lecture Slides or PDF</h3>
            <p className="text-xs text-white/50 mb-6 leading-relaxed">
              Read together with continuous scrolling, live highlighters, and collaborative sticky notes.
            </p>

            <label className="px-5 py-2.5 rounded-xl bg-[#53fc18] text-[#0c0e12] font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg hover:brightness-110 active:scale-95 transition-transform">
              <UploadCloud size={15} />
              Choose PDF File
              <input type="file" accept=".pdf,application/pdf" onChange={handleFileUpload} className="hidden" />
            </label>

            {roomPdfFiles.length > 0 && (
              <div className="w-full mt-6 pt-4 border-t border-white/10 text-left">
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-2">
                  Or pick from room PDFs ({roomPdfFiles.length})
                </p>
                <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar">
                  {roomPdfFiles.map((f) => (
                    <button
                      key={f._id}
                      onClick={() => openRoomPdf(f)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-[#53fc18]/15 hover:border-[#53fc18]/30 border border-white/5 text-left text-xs transition-all group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={14} className="text-red-400 shrink-0" />
                        <span className="truncate text-white/90 font-medium group-hover:text-[#53fc18]">
                          {f.fileName}
                        </span>
                      </div>
                      <span className="text-[10px] text-white/40 shrink-0 ml-2 group-hover:text-[#53fc18] font-semibold">
                        Open
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-2">
            {loading && (
              <div className="p-8 text-center text-white/60 flex items-center gap-2">
                <Loader2 size={20} className="animate-spin text-[#53fc18]" />
                <span className="text-xs font-bold">Loading PDF Document…</span>
              </div>
            )}

            {/* Continuous Multi-Page List */}
            {Array.from({ length: numPages || 1 }, (_, i) => i + 1).map((pageNum) => (
              <div key={pageNum} id={`pdf-page-${pageNum}`} className="relative flex flex-col items-center">
                <PdfPageItem
                  doc={pdfDoc}
                  pageNumber={pageNum}
                  scale={scale}
                  activeTool={activeTool}
                  highlights={highlights}
                  notes={notes}
                  onCanvasClick={handleCanvasClick}
                  onVisible={handlePageVisible}
                />
                <div className="text-center mt-1 text-[10px] text-white/30 font-mono">
                  Page {pageNum} of {numPages}
                </div>
              </div>
            ))}

            {/* In-Progress Sticky Note Placement Form */}
            {noteCoords && (
              <form
                onSubmit={submitNote}
                className="fixed z-50 p-3 rounded-2xl bg-[#12151c] border border-[#53fc18]/50 shadow-2xl w-64 text-white animate-in zoom-in-95 duration-150 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#53fc18]">
                    Add Sticky Note (Page {noteCoords.pageNumber})
                  </span>
                  <button type="button" onClick={() => setNoteCoords(null)} className="text-white/40 hover:text-white">
                    <X size={12} />
                  </button>
                </div>
                <input
                  type="text"
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Type note or question..."
                  autoFocus
                  className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/15 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#53fc18] mb-3"
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-[#53fc18] text-[#0c0e12] font-bold text-xs shadow-md"
                  >
                    Post Note
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
