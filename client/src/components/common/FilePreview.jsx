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
  if (category === 'text') return <FileText size={size} className="text-green-600" />
  return <File size={size} className="text-on-surface/40" />
}

function PdfViewer({ url, fileName }) {
  const [page, setPage] = useState(1)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 bg-surface-container-high/50 border-b border-outline-variant/20">
        <span className="text-xs font-medium text-on-surface/60 truncate max-w-[200px]">{fileName}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface/40 hover:bg-surface-container disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-[11px] text-on-surface/50 font-mono min-w-[40px] text-center">{page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface/40 hover:bg-surface-container transition-colors"
          >
            <ChevronRight size={14} />
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
      <div className="flex items-center justify-between px-4 py-2 bg-surface-container-high/50 border-b border-outline-variant/20">
        <span className="text-xs font-medium text-on-surface/60 truncate max-w-[200px]">{fileName}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))} className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface/40 hover:bg-surface-container transition-colors">
            <ZoomOut size={14} />
          </button>
          <span className="text-[11px] text-on-surface/50 font-mono min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface/40 hover:bg-surface-container transition-colors">
            <ZoomIn size={14} />
          </button>
          <div className="w-px h-4 bg-outline-variant/30 mx-1" />
          <button onClick={() => setRotation((r) => r + 90)} className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface/40 hover:bg-surface-container transition-colors">
            <RotateCw size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto flex items-center justify-center bg-surface-container/30 p-4">
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
  }, [files])

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
      <div className="flex h-full w-full overflow-hidden bg-surface-container-low">
        <div className="w-52 border-r border-outline-variant/20 flex flex-col shrink-0">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-outline-variant/20">
            <span className="text-xs font-semibold text-on-surface">Shared Files</span>
            <button onClick={onToggle} className="w-6 h-6 rounded-md flex items-center justify-center text-on-surface/40 hover:bg-surface-container transition-colors">
              <X size={12} />
            </button>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`mx-2 mt-2 mb-2 border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all ${
              dragOver ? 'border-primary bg-primary-container/20' : 'border-outline-variant/20 hover:border-primary/40'
            }`}
          >
            {uploading ? (
              <Loader2 size={16} className="mx-auto mb-1 text-primary animate-spin" />
            ) : (
              <Upload size={16} className={`mx-auto mb-1 ${dragOver ? 'text-primary' : 'text-on-surface/25'}`} />
            )}
            <p className={`text-[10px] font-medium ${dragOver ? 'text-primary' : 'text-on-surface/40'}`}>
              {uploading ? 'Uploading...' : 'Drop files here'}
            </p>
          </div>
          <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.txt,.md" onChange={handleFileSelect} className="hidden" />

          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
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
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all group ${
                      activeFile?._id === file._id
                        ? 'bg-primary-container/30 border border-primary/20'
                        : 'hover:bg-surface-container border border-transparent'
                    }`}
                  >
                    <FileIcon category={cat} size={14} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-on-surface truncate">{file.fileName}</p>
                      <p className="text-[9px] text-on-surface/30">{formatFileSize(file.size)}</p>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={getDownloadUrl(file)} onClick={(e) => e.stopPropagation()} className="w-5 h-5 rounded flex items-center justify-center text-on-surface/30 hover:text-on-surface/60 transition-colors">
                        <Download size={10} />
                      </a>
                      <button onClick={(e) => { e.stopPropagation(); removeFile(file) }} className="w-5 h-5 rounded flex items-center justify-center text-on-surface/30 hover:text-error transition-colors">
                        <Trash2 size={10} />
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
                  <a href={getDownloadUrl(activeFile)} className="mt-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:shadow-md transition-shadow">
                    <Download size={12} /> Download
                  </a>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <Eye size={32} className="text-on-surface/10 mb-3" />
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
        className="absolute bottom-16 right-0 z-50 w-80 bg-surface-container-low border border-outline-variant/30 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-primary" />
            <span className="text-xs font-semibold text-on-surface">Shared Files</span>
            <span className="text-[10px] text-on-surface/30 bg-surface-container px-1.5 py-0.5 rounded-full">{files.length}</span>
          </div>
          <button onClick={onToggle} className="w-6 h-6 rounded-md flex items-center justify-center text-on-surface/40 hover:bg-surface-container transition-colors">
            <X size={12} />
          </button>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`mx-3 mt-3 border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all ${
            dragOver ? 'border-primary bg-primary-container/20' : 'border-outline-variant/20 hover:border-primary/40'
          }`}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin text-primary" />
              <span className="text-[11px] text-primary font-medium">Uploading...</span>
            </div>
          ) : (
            <>
              <Upload size={18} className={`mx-auto mb-1 ${dragOver ? 'text-primary' : 'text-on-surface/20'}`} />
              <p className={`text-[11px] font-medium ${dragOver ? 'text-primary' : 'text-on-surface/35'}`}>
                Drop files or click to upload
              </p>
            </>
          )}
        </div>
        <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.txt,.md" onChange={handleFileSelect} className="hidden" />

        <div className="max-h-48 overflow-y-auto p-2 space-y-1">
          {files.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-[10px] text-on-surface/25">No shared files yet</p>
            </div>
          ) : (
            [...files].reverse().map((file) => {
              const cat = getFileCategory(file.mimeType)
              return (
                <div
                  key={file._id}
                  onClick={() => { setActiveFile(file); onToggle?.('expand', file) }}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-container cursor-pointer group transition-colors"
                >
                  <FileIcon category={cat} size={16} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-on-surface truncate">{file.fileName}</p>
                    <p className="text-[9px] text-on-surface/30">{formatFileSize(file.size)} · {file.uploadedByName}</p>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={getDownloadUrl(file)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-5 h-5 rounded flex items-center justify-center text-on-surface/30 hover:text-on-surface/60 transition-colors"
                    >
                      <Download size={10} />
                    </a>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(file) }}
                      className="w-5 h-5 rounded flex items-center justify-center text-on-surface/30 hover:text-error transition-colors"
                    >
                      <Trash2 size={10} />
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
      className="absolute inset-4 bottom-16 z-50 bg-surface-container-low border border-outline-variant/30 rounded-3xl shadow-2xl flex overflow-hidden"
    >
      <div className="w-64 border-r border-outline-variant/20 flex flex-col shrink-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
          <span className="text-sm font-semibold text-on-surface">Shared Files</span>
          <button onClick={onToggle} className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface/40 hover:bg-surface-container transition-colors">
            <X size={14} />
          </button>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`mx-3 mt-3 mb-2 border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
            dragOver ? 'border-primary bg-primary-container/20 scale-[1.02]' : 'border-outline-variant/30 hover:border-primary/40 hover:bg-surface-container/50'
          }`}
        >
          {uploading ? (
            <Loader2 size={24} className="mx-auto mb-2 text-primary animate-spin" />
          ) : (
            <Upload size={24} className={`mx-auto mb-2 ${dragOver ? 'text-primary' : 'text-on-surface/25'}`} />
          )}
          <p className={`text-xs font-medium ${dragOver ? 'text-primary' : 'text-on-surface/40'}`}>
            {uploading ? 'Uploading...' : 'Drop files here'}
          </p>
          <p className="text-[10px] text-on-surface/25 mt-1">or click to browse</p>
        </div>
        <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.txt,.md" onChange={handleFileSelect} className="hidden" />

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText size={28} className="text-on-surface/10 mb-2" />
              <p className="text-[11px] text-on-surface/30">No files yet</p>
            </div>
          ) : (
            [...files].reverse().map((file) => {
              const cat = getFileCategory(file.mimeType)
              return (
                <div
                  key={file._id}
                  onClick={() => setActiveFile(file)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all group ${
                    activeFile?._id === file._id
                      ? 'bg-primary-container/30 border border-primary/20'
                      : 'hover:bg-surface-container border border-transparent'
                  }`}
                >
                  <FileIcon category={cat} size={18} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-on-surface truncate">{file.fileName}</p>
                    <p className="text-[10px] text-on-surface/30">{formatFileSize(file.size)} · {formatTime(file.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href={getDownloadUrl(file)} onClick={(e) => e.stopPropagation()} className="w-6 h-6 rounded-md flex items-center justify-center text-on-surface/30 hover:text-on-surface/60 transition-colors">
                      <Download size={11} />
                    </a>
                    <button onClick={(e) => { e.stopPropagation(); removeFile(file) }} className="w-6 h-6 rounded-md flex items-center justify-center text-on-surface/30 hover:text-error transition-colors">
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {files.length > 0 && (
          <div className="px-3 py-2 border-t border-outline-variant/20">
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
                <a href={getDownloadUrl(activeFile)} className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-semibold flex items-center gap-2 hover:shadow-lg transition-shadow">
                  <Download size={14} /> Download File
                </a>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <Eye size={40} className="text-on-surface/10 mb-4" />
            <p className="text-sm text-on-surface/40">Select a file to preview</p>
            <p className="text-xs text-on-surface/25 mt-1">Drag & drop or click the upload area</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
