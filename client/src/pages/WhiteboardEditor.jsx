import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2, Undo2, Redo2, Share2, Pencil, Check, X } from 'lucide-react'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import Whiteboard from '../components/whiteboard/Whiteboard'
import ShareWhiteboardModal from '../components/whiteboard/ShareWhiteboardModal'
import CommentLayer from '../components/whiteboard/CommentLayer'

export default function WhiteboardEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [board, setBoard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actions, setActions] = useState([])
  const [saveState, setSaveState] = useState('saved') // saving | saved | error
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [myRole, setMyRole] = useState('viewer')
  const [comments, setComments] = useState([])

  const actionsRef = useRef([])
  const saveTimerRef = useRef(null)
  const unmountedRef = useRef(false)
  const redoStackRef = useRef([])

  useEffect(() => {
    unmountedRef.current = false
    api.getWhiteboard(id)
      .then((data) => {
        setBoard(data.whiteboard)
        setMyRole(data.role || 'viewer')
        setComments(data.whiteboard.comments || [])
        const initial = data.whiteboard.actions || []
        actionsRef.current = initial
        setActions(initial)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
    return () => {
      unmountedRef.current = true
    }
  }, [id])

  const persist = useCallback(() => {
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      api.saveWhiteboardActions(id, actionsRef.current)
        .then(() => { if (!unmountedRef.current) setSaveState('saved') })
        .catch(() => { if (!unmountedRef.current) setSaveState('error') })
    }, 600)
  }, [id])

  const updateActions = useCallback((updater) => {
    setActions((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      actionsRef.current = next
      return next
    })
    setSaveState('saving')
    persist()
  }, [persist])

  const handleDraw = useCallback((action) => {
    redoStackRef.current = []
    setCanRedo(false)
    updateActions((prev) => [...prev, action])
  }, [updateActions])

  const handleClear = useCallback(() => {
    if (!confirm('Clear the whiteboard? This cannot be undone.')) return
    redoStackRef.current = []
    setCanRedo(false)
    updateActions([])
  }, [updateActions])

  const undoRef = useRef(() => {})
  const redoRef = useRef(() => {})

  const handleUndo = useCallback(() => {
    updateActions((prev) => {
      if (!prev.length) return prev
      redoStackRef.current.push(prev[prev.length - 1])
      if (redoStackRef.current.length > 100) redoStackRef.current.shift()
      setCanRedo(true)
      return prev.slice(0, -1)
    })
  }, [updateActions])

  const handleRedo = useCallback(() => {
    const next = redoStackRef.current.pop()
    if (!next) return
    setCanRedo(redoStackRef.current.length > 0)
    updateActions((prev) => [...prev, next])
  }, [updateActions])

  useEffect(() => {
    undoRef.current = handleUndo
    redoRef.current = handleRedo
  }, [handleUndo, handleRedo])

  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const key = e.key.toLowerCase()
      if (key !== 'z' && key !== 'y') return
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (editingTitle) return
      e.preventDefault()
      if ((key === 'z' && e.shiftKey) || key === 'y') redoRef.current()
      else undoRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editingTitle])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        api.saveWhiteboardActions(id, actionsRef.current).catch(() => {})
      }
    }
  }, [id])

  const isOwner = myRole === 'owner'
  const canEditContent = myRole === 'owner' || myRole === 'editor' || myRole === 'link-editor'

  const handleAddComment = useCallback(async (payload) => {
    const data = await api.addWhiteboardComment(id, payload)
    setComments(data.whiteboard.comments || [])
  }, [id])

  const handleDeleteComment = useCallback(async (commentId) => {
    const data = await api.deleteWhiteboardComment(id, commentId)
    setComments(data.whiteboard.comments || [])
  }, [id])

  const handleRename = async (e) => {
    e.preventDefault()
    if (!titleDraft.trim()) { setEditingTitle(false); return }
    try {
      const data = await api.updateWhiteboard(id, { title: titleDraft.trim() })
      setBoard((prev) => ({ ...prev, title: data.whiteboard.title }))
    } catch (err) {
      alert(err.message)
    }
    setEditingTitle(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  if (error || !board) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-on-surface/50 mb-4">{error || 'Whiteboard not found'}</p>
        <button
          onClick={() => navigate('/whiteboards')}
          className="flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary-container rounded-xl text-sm font-semibold"
        >
          <ArrowLeft size={16} /> Back to My Whiteboard
        </button>
      </div>
    )
  }

  const saveLabel =
    saveState === 'saving' ? 'Saving...' : saveState === 'error' ? 'Save failed' : 'Saved'

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-3 px-4 lg:px-6 py-3 bg-surface border-b border-outline-variant/20 shrink-0">
        <button
          onClick={() => navigate('/whiteboards')}
          className="flex items-center gap-2 text-sm text-on-surface/50 hover:text-on-surface transition-colors"
          title="Back to My Whiteboard"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="w-px h-5 bg-outline-variant/30" />

        {editingTitle ? (
          <form onSubmit={handleRename} className="flex items-center gap-2">
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-outline-variant/40 bg-surface-container-lowest text-sm text-on-surface outline-none focus:border-primary-container"
            />
            <button type="submit" className="text-primary p-1.5 rounded-lg hover:bg-primary-container/30 transition-colors" title="Save title">
              <Check size={16} />
            </button>
            <button
              type="button"
              onClick={() => setEditingTitle(false)}
              className="text-on-surface/40 p-1.5 rounded-lg hover:bg-surface-container transition-colors"
              title="Cancel"
            >
              <X size={16} />
            </button>
          </form>
        ) : (
          <h1 className="text-sm font-semibold text-on-surface flex items-center gap-2">
            {board.title}
            {isOwner && (
              <button
                onClick={() => { setTitleDraft(board.title); setEditingTitle(true) }}
                className="text-on-surface/30 hover:text-on-surface transition-colors"
                title="Rename"
              >
                <Pencil size={13} />
              </button>
            )}
          </h1>
        )}

        <motion.span
          key={saveState}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`text-xs font-medium ${
            saveState === 'error' ? 'text-error' : saveState === 'saving' ? 'text-on-surface/40' : 'text-success'
          }`}
        >
          {saveLabel}
        </motion.span>

        <div className="ml-auto flex items-center gap-2">
          {canEditContent && (
            <>
              <button
                onClick={() => undoRef.current()}
                disabled={!actions.length}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high text-on-surface rounded-xl text-xs font-semibold hover:bg-surface-container-high/80 transition-colors disabled:opacity-40 disabled:hover:bg-surface-container-high"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 size={14} /> Undo
              </button>
              <button
                onClick={() => redoRef.current()}
                disabled={!canRedo}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high text-on-surface rounded-xl text-xs font-semibold hover:bg-surface-container-high/80 transition-colors disabled:opacity-40 disabled:hover:bg-surface-container-high"
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo2 size={14} /> Redo
              </button>
            </>
          )}
          {!canEditContent && (
            <span className="text-[10px] px-2 py-1 rounded-lg bg-tertiary-container/60 text-on-tertiary-container font-medium">
              View only
            </span>
          )}
          {isOwner && (
            <button
              onClick={() => setShareOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary rounded-xl text-xs font-semibold hover:shadow-sm transition-shadow"
            >
              <Share2 size={14} /> Share
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <Whiteboard
          boardName={board.title}
          standalone
          connected={false}
          roomUsers={[]}
          remoteCursors={{}}
          actions={actions}
          onDraw={handleDraw}
          onClear={canEditContent ? handleClear : undefined}
          readOnly={!canEditContent}
          fullScreen
          onToggleFullScreen={() => navigate('/whiteboards')}
        />
        <CommentLayer
          comments={comments}
          participants={[
            { id: String(board.owner?._id || board.owner), name: board.owner?.name || '' },
            ...(board.sharedWith || []).map((e) => ({
              id: String(e.user?._id || e.user),
              name: e.user?.name || '',
            })),
          ]}
          currentUserId={String(user?.id)}
          isOwner={isOwner}
          onAdd={handleAddComment}
          onDelete={handleDeleteComment}
        />
      </div>

      <AnimatePresence>
        {shareOpen && (
          <ShareWhiteboardModal board={board} onClose={() => setShareOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
