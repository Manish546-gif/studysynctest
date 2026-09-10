import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  UploadCloud,
  File,
  Image,
  FileText,
  X,
  Download,
  Eye,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BookOpen,
} from 'lucide-react'
import api from '../../services/api'

const FILE_TYPES = {
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'application/pdf': 'pdf',
  'text/plain': 'text',
  'text/markdown': 'text',
}

function getFileCategory(type, fileName = '') {
  if (type && FILE_TYPES[type]) return FILE_TYPES[type]
  const ext = fileName.toLowerCase().split('.').pop()
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  if (['txt', 'md', 'doc', 'docx'].includes(ext)) return 'text'
  return 'other'
}

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatTime(value) {
  if (!value) return ''
  const d = new Date(value)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function FileIcon({ category, size = 16 }) {
  if (category === 'image') return <Image size={size} className="text-blue-400" />
  if (category === 'pdf') return <FileText size={size} className="text-red-400" />
  if (category === 'text') return <FileText size={size} className="text-[#53fc18]" />
  return <File size={size} className="text-white/40" />
}

function PdfViewer({ url, fileName, onCoRead }) {
  return (
    <div className="flex flex-col h-full bg-[#0a0c10]">
      {/* Viewer Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#14171f] border-b border-[#2a2d33] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded bg-red-500/15 text-red-400 flex items-center justify-center shrink-0">
            <FileText size={13} />
          </div>
          <span className="text-xs font-semibold text-white/90 truncate max-w-[220px]" title={fileName}>
            {fileName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onCoRead && (
            <button
              onClick={onCoRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#53fc18] text-[#0e1117] hover:brightness-110 font-bold text-[11px] transition-all shadow-md active:scale-95 cursor-pointer"
              title="Open and co-read synchronously with all members in the room"
            >
              <BookOpen size={13} />
              <span>Co-Read in Room</span>
            </button>
          )}

          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-[11px] font-medium border border-white/10 transition-colors"
            title="Open in new tab"
          >
            <Download size={11} />
            <span>Open Original</span>
          </a>
        </div>
      </div>

      <iframe
        src={`${url}#toolbar=1&navpanes=0`}
        className="flex-1 w-full border-0 bg-[#0e1117]"
        title={fileName}
      />
    </div>
  )
}

function ImageViewer({ url, fileName }) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  return (
    <div className="flex flex-col h-full bg-[#0a0c10]">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#14171f] border-b border-[#2a2d33] shrink-0">
        <span className="text-xs font-semibold text-white/90 truncate max-w-[220px]" title={fileName}>
          {fileName}
        </span>
        <div className="flex items-center gap-1 bg-[#191d26] px-1 py-0.5 rounded-lg border border-white/10">
          <button
            onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
            className="w-6 h-6 rounded flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            title="Zoom out"
          >
            <ZoomOut size={13} />
          </button>
          <span className="text-[10px] text-white/70 font-mono min-w-[36px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            className="w-6 h-6 rounded flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            title="Zoom in"
          >
            <ZoomIn size={13} />
          </button>
          <div className="w-px h-3.5 bg-white/10 mx-0.5" />
          <button
            onClick={() => setRotation((r) => r + 90)}
            className="w-6 h-6 rounded flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            title="Rotate 90°"
          >
            <RotateCw size={13} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto flex items-center justify-center bg-[#07090c] p-4">
        <img
          src={url}
          alt={fileName}
          className="max-w-full max-h-full object-contain transition-transform duration-200"
          style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
          draggable={false}
        />
      </div>
    </div>
  )
}

export default function FilePreview({
  roomId,
  files = [],
  setFiles,
  emitFileUploaded,
  emitFileDeleted,
  isOpen,
  onToggle,
  compact,
  panel,
  onOpenPdfCoReader,
}) {
  const [activeFile, setActiveFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (files.length > 0) {
      if (!activeFile || !files.some((f) => String(f._id) === String(activeFile._id))) {
        setActiveFile(files[files.length - 1]);
      }
    } else {
      setActiveFile(null);
    }
  }, [files, activeFile])

  const uploadFile = useCallback(
    async (file) => {
      if (!roomId || !file) return
      setUploading(true)
      try {
        const { file: saved } = await api.uploadRoomFile(roomId, file)
        if (saved) {
          setFiles?.((prev) => (prev.some((f) => String(f._id) === String(saved._id)) ? prev : [...prev, saved]))
          setActiveFile(saved)
          emitFileUploaded?.(saved)
        }
      } catch (err) {
        console.error('Upload failed:', err.message)
        alert('Upload failed: ' + err.message)
      } finally {
        setUploading(false)
      }
    },
    [roomId, emitFileUploaded, setFiles]
  )

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      setDragOver(false)
      Array.from(e.dataTransfer.files).forEach(uploadFile)
    },
    [uploadFile]
  )

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setDragOver(false), [])

  const handleFileSelect = useCallback(
    (e) => {
      Array.from(e.target.files).forEach(uploadFile)
      e.target.value = ''
    },
    [uploadFile]
  )

  const removeFile = useCallback(
    async (file) => {
      if (!roomId || !file) return
      const ok = window.confirm(`Delete "${file.fileName}" from this room?`)
      if (!ok) return
      setDeletingId(file._id)
      try {
        await api.deleteRoomFile(roomId, file._id)
        emitFileDeleted?.(file._id)
        setFiles?.((prev) => prev.filter((f) => String(f._id) !== String(file._id)))
        if (String(activeFile?._id) === String(file._id)) {
          setActiveFile(null)
        }
      } catch (err) {
        console.error('Delete failed:', err.message)
        alert('Delete failed: ' + (err.message || 'Server error'))
      } finally {
        setDeletingId(null)
      }
    },
    [roomId, activeFile, emitFileDeleted, setFiles]
  )

  const getDownloadUrl = useCallback((file) => {
    if (file?.url) {
      if (/^https?:\/\//.test(file.url)) return file.url
      const token = localStorage.getItem('token')
      const base = file.url.startsWith('/') ? file.url : `/${file.url}`
      return base + (base.includes('?') ? '&' : '?') + `token=${token}`
    }
    return '#'
  }, [])

  if (!isOpen) return null

  // Panel mode (e.g. inside Whiteboard sidebar tab)
  if (panel) {
    return (
      <div className="flex h-full w-full overflow-hidden bg-[#101318] text-white">
        <div className="w-56 border-r border-[#2a2d33] flex flex-col shrink-0 bg-[#14171f]">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2d33]">
            <span className="text-xs font-bold text-white">Shared Files</span>
            <button
              onClick={onToggle}
              className="w-5 h-5 rounded flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={12} />
            </button>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`mx-2 mt-2 mb-2 border border-dashed rounded-xl p-3 text-center cursor-pointer transition-all ${
              dragOver ? 'border-[#53fc18] bg-[#53fc18]/15 text-[#53fc18]' : 'border-[#2a2d33] bg-[#191d26] hover:border-[#53fc18]/50 text-white/50'
            }`}
          >
            {uploading ? (
              <Loader2 size={15} className="mx-auto mb-1 text-[#53fc18] animate-spin" />
            ) : (
              <UploadCloud size={16} className={`mx-auto mb-1 ${dragOver ? 'text-[#53fc18]' : 'text-white/40'}`} />
            )}
            <p className={`text-[10px] font-semibold ${dragOver ? 'text-[#53fc18]' : 'text-white/70'}`}>
              {uploading ? 'Uploading...' : 'Upload PDF or File'}
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.md,.docx,.pptx"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {files.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-[10px] text-white/30">No files uploaded yet</p>
              </div>
            ) : (
              [...files].reverse().map((file) => {
                const cat = getFileCategory(file.mimeType, file.fileName)
                return (
                  <div
                    key={file._id}
                    onClick={() => setActiveFile(file)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all group ${
                      activeFile?._id === file._id
                        ? 'bg-[#1e261f] border border-[#53fc18]/40 ring-1 ring-[#53fc18]/20'
                        : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <FileIcon category={cat} size={14} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-white/90 truncate">{file.fileName}</p>
                      <p className="text-[9px] text-white/40">{formatFileSize(file.size)}</p>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {cat === 'pdf' && onOpenPdfCoReader && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenPdfCoReader(file)
                          }}
                          className="w-5 h-5 rounded flex items-center justify-center text-[#53fc18] hover:bg-[#53fc18]/20 transition-colors"
                          title="Co-Read in Room"
                        >
                          <BookOpen size={10} />
                        </button>
                      )}
                      <a
                        href={getDownloadUrl(file)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-5 h-5 rounded flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <Download size={10} />
                      </a>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(file)
                        }}
                        disabled={deletingId === file._id}
                        className="w-5 h-5 rounded flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-white/10 disabled:opacity-40 transition-colors cursor-pointer"
                        title="Delete file"
                      >
                        {deletingId === file._id ? (
                          <Loader2 size={10} className="animate-spin text-red-400" />
                        ) : (
                          <Trash2 size={10} />
                        )}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0c10]">
          {activeFile ? (
            <>
              {getFileCategory(activeFile.mimeType, activeFile.fileName) === 'pdf' && (
                <PdfViewer
                  url={getDownloadUrl(activeFile)}
                  fileName={activeFile.fileName}
                  onCoRead={onOpenPdfCoReader ? () => onOpenPdfCoReader(activeFile) : null}
                />
              )}
              {getFileCategory(activeFile.mimeType, activeFile.fileName) === 'image' && (
                <ImageViewer url={getDownloadUrl(activeFile)} fileName={activeFile.fileName} />
              )}
              {['text', 'other'].includes(getFileCategory(activeFile.mimeType, activeFile.fileName)) && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-white">
                  <FileIcon category="other" size={36} />
                  <p className="text-xs font-semibold text-white/90 mt-3 mb-1">{activeFile.fileName}</p>
                  <p className="text-[10px] text-white/40 mb-3">{formatFileSize(activeFile.size)}</p>
                  <a
                    href={getDownloadUrl(activeFile)}
                    className="px-3.5 py-1.5 bg-[#53fc18] text-[#0e1117] font-bold rounded-lg text-xs hover:brightness-110 transition-colors flex items-center gap-1.5 shadow-md"
                  >
                    <Download size={12} /> Download
                  </a>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-white/40">
              <Eye size={26} className="text-white/20 mb-2" />
              <p className="text-xs">Select a file to preview</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Standard Room Overlay Mode (Centered Modal with guaranteed stable width & dark theme)
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onToggle?.()
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 14 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative w-full max-w-4xl h-[640px] max-h-[90vh] bg-[#101318] border border-[#2a2d33] rounded-2xl shadow-2xl flex overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Sidebar: Upload Dropzone & Files List */}
        <div className="w-72 sm:w-80 bg-[#12151b] border-r border-[#2a2d33] flex flex-col shrink-0">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2d33] bg-[#161a22]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#53fc18]/15 text-[#53fc18] flex items-center justify-center font-bold">
                <FileText size={13} />
              </div>
              <span className="text-xs font-bold text-white tracking-wide">Shared Room Files</span>
            </div>
            <span className="text-[10px] font-mono text-[#53fc18] bg-[#53fc18]/10 border border-[#53fc18]/25 px-2 py-0.5 rounded-full font-bold">
              {files.length} {files.length === 1 ? 'file' : 'files'}
            </span>
          </div>

          {/* Upload Dropzone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`mx-3 mt-3 mb-2 border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-[#53fc18] bg-[#53fc18]/15 text-[#53fc18] scale-[1.01]'
                : 'border-[#2a2d33] bg-[#161a22] hover:border-[#53fc18]/50 hover:bg-[#53fc18]/5 text-white/60'
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-1.5 py-1">
                <Loader2 size={20} className="mx-auto text-[#53fc18] animate-spin" />
                <span className="text-xs text-[#53fc18] font-bold">Uploading file...</span>
              </div>
            ) : (
              <>
                <UploadCloud
                  size={22}
                  className={`mx-auto mb-1.5 ${dragOver ? 'text-[#53fc18]' : 'text-[#53fc18]/80'}`}
                />
                <p className="text-xs font-bold text-white mb-0.5">
                  {dragOver ? 'Drop file to upload' : 'Upload Lecture Slides & PDFs'}
                </p>
                <p className="text-[10px] text-white/40">Drag & drop or click to browse</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.md,.pptx,.ppt,.docx,.doc"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Files List */}
          <div className="flex-1 overflow-y-auto px-2.5 py-1 space-y-1 custom-scrollbar">
            {files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-white/30">
                <FileText size={28} className="text-white/10 mb-2" />
                <p className="text-xs font-medium">No files uploaded yet</p>
                <p className="text-[10px] text-white/20 mt-0.5">Upload a PDF to view or co-read together</p>
              </div>
            ) : (
              [...files].reverse().map((file) => {
                const cat = getFileCategory(file.mimeType, file.fileName)
                const isSelected = activeFile?._id === file._id
                const isPdf = cat === 'pdf'
                return (
                  <div
                    key={file._id}
                    onClick={() => setActiveFile(file)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-all group ${
                      isSelected
                        ? 'bg-[#1a231d] border border-[#53fc18]/50 ring-1 ring-[#53fc18]/30'
                        : 'bg-[#151820] hover:bg-[#1b202a] border border-white/5'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isPdf
                          ? 'bg-red-500/15 text-red-400'
                          : cat === 'image'
                          ? 'bg-blue-500/15 text-blue-400'
                          : 'bg-[#53fc18]/15 text-[#53fc18]'
                      }`}
                    >
                      <FileIcon category={cat} size={15} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white/90 truncate">{file.fileName}</p>
                      <p className="text-[10px] text-white/40">
                        {formatFileSize(file.size)} {file.uploadedByName ? `· ${file.uploadedByName}` : ''}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className={`flex items-center gap-1 transition-opacity ${
                      isSelected ? 'opacity-100' : 'opacity-70 sm:opacity-0 sm:group-hover:opacity-100'
                    }`}>
                      {isPdf && onOpenPdfCoReader && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenPdfCoReader(file)
                          }}
                          className="w-6 h-6 rounded-lg bg-[#53fc18]/15 hover:bg-[#53fc18] text-[#53fc18] hover:text-[#0e1117] flex items-center justify-center transition-colors cursor-pointer"
                          title="Co-Read in Room"
                        >
                          <BookOpen size={11} />
                        </button>
                      )}
                      <a
                        href={getDownloadUrl(file)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-6 h-6 rounded-lg hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        title="Download"
                      >
                        <Download size={12} />
                      </a>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(file)
                        }}
                        disabled={deletingId === file._id}
                        className="w-6 h-6 rounded-lg hover:bg-red-500/20 text-white/50 hover:text-red-400 disabled:opacity-40 flex items-center justify-center transition-colors cursor-pointer"
                        title="Delete file"
                      >
                        {deletingId === file._id ? (
                          <Loader2 size={11} className="animate-spin text-red-400" />
                        ) : (
                          <Trash2 size={12} />
                        )}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Main Preview Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0c10]">
          {/* Top close bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#12151b] border-b border-[#2a2d33] shrink-0">
            <span className="text-[11px] font-mono text-white/40 uppercase tracking-wider">File Preview</span>
            <button
              onClick={onToggle}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
              title="Close"
            >
              <X size={14} />
            </button>
          </div>

          {activeFile ? (
            <>
              {getFileCategory(activeFile.mimeType, activeFile.fileName) === 'pdf' && (
                <PdfViewer
                  url={getDownloadUrl(activeFile)}
                  fileName={activeFile.fileName}
                  onCoRead={onOpenPdfCoReader ? () => onOpenPdfCoReader(activeFile) : null}
                />
              )}
              {getFileCategory(activeFile.mimeType, activeFile.fileName) === 'image' && (
                <ImageViewer url={getDownloadUrl(activeFile)} fileName={activeFile.fileName} />
              )}
              {['text', 'other'].includes(getFileCategory(activeFile.mimeType, activeFile.fileName)) && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-white">
                  <div className="w-16 h-16 rounded-2xl bg-[#161a22] border border-white/10 flex items-center justify-center text-white/60 mb-4 shadow-xl">
                    <FileIcon category="other" size={32} />
                  </div>
                  <p className="text-sm font-bold text-white mb-1">{activeFile.fileName}</p>
                  <p className="text-xs text-white/40 mb-5">{formatFileSize(activeFile.size)}</p>
                  <a
                    href={getDownloadUrl(activeFile)}
                    className="px-5 py-2.5 bg-[#53fc18] text-[#0e1117] font-bold rounded-xl text-xs flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-lg"
                  >
                    <Download size={14} /> Download File
                  </a>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-white/40">
              <div className="w-16 h-16 rounded-2xl bg-[#161a22] border border-white/10 flex items-center justify-center text-white/20 mb-3">
                <UploadCloud size={30} />
              </div>
              <p className="text-sm font-bold text-white/70">Select a file to preview</p>
              <p className="text-xs text-white/30 mt-1">Upload lecture slides, PDFs, or documents on the left</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
