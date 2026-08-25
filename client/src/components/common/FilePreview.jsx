import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Upload,
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
} from 'lucide-react'
import { api } from '../../services/api'

const FILE_TYPES = {
  'image/png': 'image', 'image/jpeg': 'image', 'image/jpg': 'image',
  'image/gif': 'image', 'image/webp': 'image', 'image/svg+xml': 'image',
  'application/pdf': 'pdf',
  'text/plain': 'text', 'text/markdown': 'text',
}

function getFileCategory(type) {
  return FILE_TYPES[type] || 'other'
}

function formatFileSize(bytes) {
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

function FileIcon({ category, size = 20 }) {
  if (category === 'image') return <Image size={size} className="text-blue-500" />
  if (category === 'pdf') return <FileText size={size} className="text-red-500" />
  if (category === 'text') return <FileText size={size} className="text-success" />
  return <File size={size} className="text-on-surface/40" />
}

function PdfViewer({ url, fileName }) {
  const [page, setPage] = useState(1)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/[0.03] border-b border-black/10">
        <span className="text-[11px] font-medium text-on-surface/60 truncate max-w-[200px]">{fileName}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="w-6 h-6 rounded flex items-center justify-center text-on-surface/40 hover:bg-black/5 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={13} />
          </button>
          <span className="text-[10px] text-on-surface/50 font-mono min-w-[32px] text-center">{page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            className="w-6 h-6 rounded flex items-center justify-center text-on-surface/40 hover:bg-black/5 transition-colors"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
      <iframe src={`${url}#page=${page}`} className="flex-1 w-full border-0" title={fileName} />
    </div>
  )
}

function ImageViewer({ url, fileName }) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/[0.03] border-b border-black/10">
        <span className="text-[11px] font-medium text-on-surface/60 truncate max-w-[200px]">{fileName}</span>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))} className="w-6 h-6 rounded flex items-center justify-center text-on-surface/40 hover:bg-black/5 transition-colors">
            <ZoomOut size={13} />
          </button>
          <span className="text-[10px] text-on-surface/50 font-mono min-w-[32px] text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="w-6 h-6 rounded flex items-center justify-center text-on-surface/40 hover:bg-black/5 transition-colors">
            <ZoomIn size={13} />
          </button>
          <div className="w-px h-3.5 bg-black/10 mx-0.5" />
          <button onClick={() => setRotation((r) => r + 90)} className="w-6 h-6 rounded flex items-center justify-center text-on-surface/40 hover:bg-black/5 transition-colors">
            <RotateCw size={13} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto flex items-center justify-center bg-black/[0.02] p-4">
        <img src={url} alt={fileName} className="max-w-full max-h-full object-contain transition-transform duration-200" style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }} draggable={false} />
      </div>
    </div>
  )
}

export default function FilePreview({
  roomId,
  files,
  setFiles,
  emitFileUploaded,
  emitFileDeleted,
  isOpen,
  onToggle,
  compact,
  panel,
}) {
  const [activeFile, setActiveFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (files.length > 0 && !activeFile) {
      setActiveFile(files[files.length - 1])
    }
  }, [files, activeFile])

  const uploadFile = useCallback(async (file) => {
    if (!roomId) return
    setUploading(true)
    try {
      const { file: saved } = await api.uploadRoomFile(roomId, file)
      emitFileUploaded?.(saved)
    } catch (err) {
      console.error('Upload failed:', err.message)
      alert('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }, [roomId, emitFileUploaded])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    Array.from(e.dataTransfer.files).forEach(uploadFile)
  }, [uploadFile])

  const handleDragOver = useCallback((e) => { e.preventDefault(); setDragOver(true) }, [])
  const handleDragLeave = useCallback(() => setDragOver(false), [])

  const handleFileSelect = useCallback((e) => {
    Array.from(e.target.files).forEach(uploadFile)
    e.target.value = ''
  }, [uploadFile])

  const removeFile = useCallback(async (file) => {
    if (!roomId) return
    try {
      await api.deleteRoomFile(roomId, file._id)
      emitFileDeleted?.(file._id)
      setFiles?.((prev) => prev.filter((f) => f._id !== file._id))
      if (activeFile?._id === file._id) setActiveFile(null)
    } catch (err) {
      console.error('Delete failed:', err.message)
    }
  }, [roomId, activeFile, emitFileDeleted, setFiles])

  const getDownloadUrl = useCallback((file) => {
    if (file.url) {
      if (/^https?:\/\//.test(file.url)) return file.url
      const token = localStorage.getItem('token')
      const base = (import.meta.env.VITE_API_URL || '') + file.url
      return base + (base.includes('?') ? '&' : '?') + `token=${token}`
    }
    return '#'
  }, [])

  if (!isOpen) return null

  if (panel) {
    return (
      <div className="flex h-full w-full overflow-hidden bg-white">
        <div className="w-52 border-r border-black/10 flex flex-col shrink-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-black/10">
            <span className="text-xs font-semibold text-on-surface">Shared Files</span>
            <button onClick={onToggle} className="w-5 h-5 rounded flex items-center justify-center text-on-surface/40 hover:bg-black/5 transition-colors">
              <X size={12} />
            </button>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`mx-2 mt-2 mb-2 border border-dashed rounded p-2.5 text-center cursor-pointer transition-all ${
              dragOver ? 'border-zoom-blue bg-zoom-blue/5' : 'border-black/15 hover:border-zoom-blue/50'
            }`}
          >
            {uploading ? (
              <Loader2 size={14} className="mx-auto mb-1 text-zoom-blue animate-spin" />
            ) : (
              <Upload size={14} className={`mx-auto mb-1 ${dragOver ? 'text-zoom-blue' : 'text-on-surface/25'}`} />
            )}
            <p className={`text-[10px] font-medium ${dragOver ? 'text-zoom-blue' : 'text-on-surface/40'}`}>
              {uploading ? 'Uploading...' : 'Drop files here'}
            </p>
          </div>
          <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.txt,.md" onChange={handleFileSelect} className="hidden" />

          <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
            {files.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-[10px] text-on-surface/25">No files yet</p>
              </div>
            ) : (
              [...files].reverse().map((file) => {
                const cat = getFileCategory(file.mimeType)
                return (
                  <div
                    key={file._id}
                    onClick={() => setActiveFile(file)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer transition-all group ${
                      activeFile?._id === file._id
                        ? 'bg-zoom-blue/10 ring-1 ring-zoom-blue/30'
                        : 'hover:bg-black/5'
                    }`}
                  >
                    <FileIcon category={cat} size={13} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-on-surface truncate">{file.fileName}</p>
                      <p className="text-[9px] text-on-surface/30">{formatFileSize(file.size)}</p>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={getDownloadUrl(file)} onClick={(e) => e.stopPropagation()} className="w-4 h-4 rounded flex items-center justify-center text-on-surface/30 hover:text-on-surface/70 transition-colors">
                        <Download size={9} />
                      </a>
                      <button onClick={(e) => { e.stopPropagation(); removeFile(file) }} className="w-4 h-4 rounded flex items-center justify-center text-on-surface/30 hover:text-red-500 transition-colors">
                        <Trash2 size={9} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {activeFile ? (
            <>
              {getFileCategory(activeFile.mimeType) === 'pdf' && (
                <PdfViewer url={getDownloadUrl(activeFile)} fileName={activeFile.fileName} />
              )}
              {getFileCategory(activeFile.mimeType) === 'image' && (
                <ImageViewer url={getDownloadUrl(activeFile)} fileName={activeFile.fileName} />
              )}
              {getFileCategory(activeFile.mimeType) === 'other' && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                  <FileIcon category="other" size={36} />
                  <p className="text-xs font-semibold text-on-surface mt-3 mb-1">{activeFile.fileName}</p>
                  <a href={getDownloadUrl(activeFile)} className="mt-2 px-3 py-1.5 bg-zoom-blue text-white rounded-lg text-xs font-medium hover:bg-[#0b5fc7] transition-colors flex items-center gap-1.5">
                    <Download size={12} /> Download
                  </a>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <Eye size={28} className="text-on-surface/10 mb-2" />
              <p className="text-xs text-on-surface/40">Select a file to preview</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="absolute bottom-14 right-0 z-50 w-72 bg-zoom-dark border border-white/10 rounded-lg shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
          <div className="flex items-center gap-1.5">
            <FileText size={13} className="text-zoom-blue" />
            <span className="text-xs font-semibold text-white">Shared Files</span>
            <span className="text-[10px] text-white/40 bg-white/10 px-1.5 py-0.5 rounded">{files.length}</span>
          </div>
          <button onClick={onToggle} className="w-5 h-5 rounded flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors">
            <X size={12} />
          </button>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`mx-2 mt-2 border border-dashed rounded p-2.5 text-center cursor-pointer transition-all ${
            dragOver ? 'border-zoom-blue bg-zoom-blue/10' : 'border-white/15 hover:border-zoom-blue/60'
          }`}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-1.5">
              <Loader2 size={12} className="animate-spin text-zoom-blue" />
              <span className="text-[11px] text-zoom-blue font-medium">Uploading...</span>
            </div>
          ) : (
            <>
              <Upload size={16} className={`mx-auto mb-1 ${dragOver ? 'text-zoom-blue' : 'text-white/20'}`} />
              <p className={`text-[11px] font-medium ${dragOver ? 'text-zoom-blue' : 'text-white/35'}`}>
                Drop files or click to upload
              </p>
            </>
          )}
        </div>
        <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.txt,.md" onChange={handleFileSelect} className="hidden" />

        <div className="max-h-48 overflow-y-auto p-1.5 space-y-0.5">
          {files.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-[10px] text-white/25">No shared files yet</p>
            </div>
          ) : (
            [...files].reverse().map((file) => {
              const cat = getFileCategory(file.mimeType)
              return (
                <div
                  key={file._id}
                  onClick={() => { setActiveFile(file); onToggle?.('expand', file) }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/10 cursor-pointer group transition-colors"
                >
                  <FileIcon category={cat} size={14} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-white/80 truncate">{file.fileName}</p>
                    <p className="text-[9px] text-white/30">{formatFileSize(file.size)} · {file.uploadedByName}</p>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={getDownloadUrl(file)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded flex items-center justify-center text-white/30 hover:text-white/70 transition-colors"
                    >
                      <Download size={9} />
                    </a>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(file) }}
                      className="w-4 h-4 rounded flex items-center justify-center text-white/30 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={9} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="absolute inset-3 bottom-14 z-50 bg-white border border-black/10 rounded-lg shadow-2xl flex overflow-hidden"
    >
      <div className="w-56 border-r border-black/10 flex flex-col shrink-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-black/10">
          <span className="text-xs font-semibold text-on-surface">Shared Files</span>
          <button onClick={onToggle} className="w-5 h-5 rounded flex items-center justify-center text-on-surface/40 hover:bg-black/5 transition-colors">
            <X size={12} />
          </button>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`mx-2 mt-2 mb-1.5 border border-dashed rounded p-4 text-center cursor-pointer transition-all ${
            dragOver ? 'border-zoom-blue bg-zoom-blue/5 scale-[1.02]' : 'border-black/15 hover:border-zoom-blue/50 hover:bg-zoom-blue/[0.03]'
          }`}
        >
          {uploading ? (
            <Loader2 size={20} className="mx-auto mb-1.5 text-zoom-blue animate-spin" />
          ) : (
            <Upload size={20} className={`mx-auto mb-1.5 ${dragOver ? 'text-zoom-blue' : 'text-on-surface/25'}`} />
          )}
          <p className={`text-xs font-medium ${dragOver ? 'text-zoom-blue' : 'text-on-surface/40'}`}>
            {uploading ? 'Uploading...' : 'Drop files here'}
          </p>
          <p className="text-[10px] text-on-surface/25 mt-0.5">or click to browse</p>
        </div>
        <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.txt,.md" onChange={handleFileSelect} className="hidden" />

        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText size={24} className="text-on-surface/10 mb-1.5" />
              <p className="text-[11px] text-on-surface/30">No files yet</p>
            </div>
          ) : (
            [...files].reverse().map((file) => {
              const cat = getFileCategory(file.mimeType)
              return (
                <div
                  key={file._id}
                  onClick={() => setActiveFile(file)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-all group ${
                    activeFile?._id === file._id
                      ? 'bg-zoom-blue/10 ring-1 ring-zoom-blue/30'
                      : 'hover:bg-black/5'
                  }`}
                >
                  <FileIcon category={cat} size={15} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-on-surface truncate">{file.fileName}</p>
                    <p className="text-[9px] text-on-surface/30">{formatFileSize(file.size)} · {formatTime(file.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href={getDownloadUrl(file)} onClick={(e) => e.stopPropagation()} className="w-5 h-5 rounded flex items-center justify-center text-on-surface/30 hover:text-on-surface/70 transition-colors">
                      <Download size={10} />
                    </a>
                    <button onClick={(e) => { e.stopPropagation(); removeFile(file) }} className="w-5 h-5 rounded flex items-center justify-center text-on-surface/30 hover:text-red-500 transition-colors">
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {files.length > 0 && (
          <div className="px-3 py-1.5 border-t border-black/10">
            <span className="text-[10px] text-on-surface/30">{files.length} file{files.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {activeFile ? (
          <>
            {getFileCategory(activeFile.mimeType) === 'pdf' && (
              <PdfViewer url={getDownloadUrl(activeFile)} fileName={activeFile.fileName} />
            )}
            {getFileCategory(activeFile.mimeType) === 'image' && (
              <ImageViewer url={getDownloadUrl(activeFile)} fileName={activeFile.fileName} />
            )}
            {getFileCategory(activeFile.mimeType) === 'other' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <FileIcon category="other" size={48} />
                <p className="text-sm font-semibold text-on-surface mt-4 mb-1">{activeFile.fileName}</p>
                <p className="text-xs text-on-surface/40 mb-4">{formatFileSize(activeFile.size)}</p>
                <a href={getDownloadUrl(activeFile)} className="px-4 py-2 bg-zoom-blue text-white rounded-lg text-sm font-medium flex items-center gap-1.5 hover:bg-[#0b5fc7] transition-colors">
                  <Download size={13} /> Download File
                </a>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <Eye size={36} className="text-on-surface/10 mb-3" />
            <p className="text-sm text-on-surface/40">Select a file to preview</p>
            <p className="text-xs text-on-surface/25 mt-1">Drag & drop or click the upload area</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
