import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Folder,
  FileText,
  PenTool,
  Trash2,
  Share2,
  X,
  Loader2,
  ExternalLink,
  Layers,
} from 'lucide-react'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import ShareWhiteboardModal from '../components/whiteboard/ShareWhiteboardModal'

function timeAgo(value) {
  if (!value) return ''
  const date = new Date(value)
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function MyWhiteboards() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [boards, setBoards] = useState([])
  const [notebooks, setNotebooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [createBoardOpen, setCreateBoardOpen] = useState(false)
  const [boardTitle, setBoardTitle] = useState('')
  const [boardDesc, setBoardDesc] = useState('')
  const [boardNotebook, setBoardNotebook] = useState('')
  const [creatingBoard, setCreatingBoard] = useState(false)

  const [createNotebookOpen, setCreateNotebookOpen] = useState(false)
  const [notebookName, setNotebookName] = useState('')
  const [creatingNotebook, setCreatingNotebook] = useState(false)

  const [shareBoard, setShareBoard] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([api.getWhiteboards(), api.getNotebooks()])
      .then(([wb, nb]) => {
        setBoards(wb.whiteboards || [])
        setNotebooks(nb.notebooks || [])
        setError('')
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const myId = String(user?.id)

  const owned = boards.filter((b) => String(b.owner?._id || b.owner) === myId)
  const shared = boards.filter((b) => String(b.owner?._id || b.owner) !== myId)
  const unfiled = owned.filter((b) => !b.notebook)

  const handleCreateBoard = async (e) => {
    e.preventDefault()
    if (!boardTitle.trim()) return
    setCreatingBoard(true)
    try {
      const data = await api.createWhiteboard({
        title: boardTitle.trim(),
        description: boardDesc.trim(),
        notebook: boardNotebook || null,
      })
      setBoards((prev) => [data.whiteboard, ...prev])
      setBoardTitle('')
      setBoardDesc('')
      setBoardNotebook('')
      setCreateBoardOpen(false)
      navigate(`/whiteboards/${data.whiteboard._id}`)
    } catch (err) {
      alert(err.message)
    } finally {
      setCreatingBoard(false)
    }
  }

  const handleCreateNotebook = async (e) => {
    e.preventDefault()
    if (!notebookName.trim()) return
    setCreatingNotebook(true)
    try {
      const data = await api.createNotebook(notebookName.trim())
      setNotebooks((prev) => [data.notebook, ...prev])
      setNotebookName('')
      setCreateNotebookOpen(false)
    } catch (err) {
      alert(err.message)
    } finally {
      setCreatingNotebook(false)
    }
  }

  const handleDeleteBoard = async (id) => {
    if (!confirm('Delete this whiteboard? This cannot be undone.')) return
    try {
      await api.deleteWhiteboard(id)
      setBoards((prev) => prev.filter((b) => b._id !== id))
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDeleteNotebook = async (id) => {
    if (!confirm('Delete this notebook? Its whiteboards will be moved to the main list.')) return
    try {
      await api.deleteNotebook(id)
      setNotebooks((prev) => prev.filter((n) => n._id !== id))
      setBoards((prev) => prev.map((b) => (String(b.notebook) === String(id) ? { ...b, notebook: null } : b)))
    } catch (err) {
      alert(err.message)
    }
  }

  const handleMove = async (id, notebookId) => {
    try {
      const data = await api.updateWhiteboard(id, { notebook: notebookId || null })
      setBoards((prev) => prev.map((b) => (b._id === id ? data.whiteboard : b)))
    } catch (err) {
      alert(err.message)
    }
  }

  const inputCls =
    'w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface-container-lowest text-sm text-on-surface placeholder:text-on-surface/25 outline-none focus:border-primary-container'

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-on-surface mb-1">My Whiteboard</h1>
          <p className="text-on-surface/50 text-sm">Create boards for different things, organize them into notebooks, and share them with others.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreateNotebookOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-surface-container-high text-on-surface rounded-xl text-sm font-semibold hover:bg-surface-container-high/80 transition-colors"
          >
            <Folder size={16} /> New Notebook
          </button>
          <button
            onClick={() => setCreateBoardOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-primary/20 transition-all"
          >
            <Plus size={16} /> New Whiteboard
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-error mb-6">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-10">
          {shared.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Share2 size={16} className="text-on-surface/40" />
                <h2 className="font-display text-sm font-bold text-on-surface uppercase tracking-wider">Shared with me</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {shared.map((wb) => (
                  <BoardCard
                    key={wb._id}
                    board={wb}
                    isOwner={false}
                    onOpen={() => navigate(`/whiteboards/${wb._id}`)}
                    onDelete={() => handleDeleteBoard(wb._id)}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Folder size={16} className="text-on-surface/40" />
              <h2 className="font-display text-sm font-bold text-on-surface uppercase tracking-wider">Notebooks</h2>
            </div>
            {notebooks.length === 0 ? (
              <button
                onClick={() => setCreateNotebookOpen(true)}
                className="w-full border-2 border-dashed border-outline-variant/40 rounded-2xl p-6 flex items-center justify-center gap-2 text-on-surface/40 hover:border-primary hover:text-primary transition-colors"
              >
                <Folder size={18} /> Create your first notebook to organize boards
              </button>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {notebooks.map((nb) => {
                  const nbBoards = owned.filter((b) => String(b.notebook) === String(nb._id))
                  return (
                    <div
                      key={nb._id}
                      className="bg-surface-container-low rounded-2xl border border-outline-variant/20 overflow-hidden"
                    >
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-9 h-9 rounded-xl bg-tertiary-container text-on-tertiary-container flex items-center justify-center shrink-0">
                          <Folder size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-on-surface truncate">{nb.name}</p>
                          <p className="text-[11px] text-on-surface/40">{nbBoards.length} board{nbBoards.length !== 1 ? 's' : ''}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteNotebook(nb._id)}
                          className="text-on-surface/30 hover:text-error transition-colors shrink-0"
                          title="Delete notebook"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="px-3 pb-3 space-y-2">
                        {nbBoards.map((wb) => (
                          <div
                            key={wb._id}
                            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 hover:border-primary-container cursor-pointer transition-colors"
                            onClick={() => navigate(`/whiteboards/${wb._id}`)}
                          >
                            <FileText size={14} className="text-on-surface/30 shrink-0" />
                            <p className="flex-1 text-xs font-medium text-on-surface truncate">{wb.title}</p>
                            <span className="text-[10px] text-on-surface/30 shrink-0">{wb.actions?.length || 0}</span>
                          </div>
                        ))}
                        {nbBoards.length === 0 && (
                          <p className="text-xs text-on-surface/25 px-1 py-1">No boards yet — add one below.</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <PenTool size={16} className="text-on-surface/40" />
              <h2 className="font-display text-sm font-bold text-on-surface uppercase tracking-wider">Whiteboards</h2>
            </div>
            {unfiled.length === 0 ? (
              <button
                onClick={() => setCreateBoardOpen(true)}
                className="w-full border-2 border-dashed border-outline-variant/40 rounded-2xl p-6 flex items-center justify-center gap-2 text-on-surface/40 hover:border-primary hover:text-primary transition-colors"
              >
                <Plus size={18} /> Create your first whiteboard
              </button>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {unfiled.map((wb) => (
                  <BoardCard
                    key={wb._id}
                    board={wb}
                    isOwner
                    notebooks={notebooks}
                    onOpen={() => navigate(`/whiteboards/${wb._id}`)}
                    onDelete={() => handleDeleteBoard(wb._id)}
                    onShare={() => setShareBoard(wb)}
                    onMove={handleMove}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Create whiteboard modal */}
      <AnimatePresence>
        {createBoardOpen && (
          <Modal title="New Whiteboard" onClose={() => setCreateBoardOpen(false)}>
            <form onSubmit={handleCreateBoard} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-on-surface/50 mb-1.5">Title</label>
                <input autoFocus value={boardTitle} onChange={(e) => setBoardTitle(e.target.value)} placeholder="e.g. Calculus Revision" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface/50 mb-1.5">Description (optional)</label>
                <input value={boardDesc} onChange={(e) => setBoardDesc(e.target.value)} placeholder="What is this board for?" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface/50 mb-1.5">Notebook (optional)</label>
                <select value={boardNotebook} onChange={(e) => setBoardNotebook(e.target.value)} className={inputCls}>
                  <option value="">No notebook</option>
                  {notebooks.map((n) => (
                    <option key={n._id} value={n._id}>{n.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setCreateBoardOpen(false)} className="px-4 py-2.5 text-sm text-on-surface/50 hover:bg-surface-container rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={!boardTitle.trim() || creatingBoard} className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-semibold disabled:opacity-50">
                  {creatingBoard ? 'Creating...' : 'Create Board'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* Create notebook modal */}
      <AnimatePresence>
        {createNotebookOpen && (
          <Modal title="New Notebook" onClose={() => setCreateNotebookOpen(false)}>
            <form onSubmit={handleCreateNotebook} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-on-surface/50 mb-1.5">Name</label>
                <input autoFocus value={notebookName} onChange={(e) => setNotebookName(e.target.value)} placeholder="e.g. Chemistry" className={inputCls} />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setCreateNotebookOpen(false)} className="px-4 py-2.5 text-sm text-on-surface/50 hover:bg-surface-container rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={!notebookName.trim() || creatingNotebook} className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-semibold disabled:opacity-50">
                  {creatingNotebook ? 'Creating...' : 'Create Notebook'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {shareBoard && <ShareWhiteboardModal board={shareBoard} onClose={() => setShareBoard(null)} />}
      </AnimatePresence>
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-full max-w-[28rem] bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/20">
          <h3 className="font-display text-base font-bold text-on-surface">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface/40 hover:bg-surface-container transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </motion.div>
    </motion.div>
  )
}

function BoardCard({ board, isOwner, notebooks = [], onOpen, onDelete, onShare, onMove }) {
  const [busy, setBusy] = useState(false)

  const handleMove = async (e) => {
    const value = e.target.value
    setBusy(true)
    try {
      await onMove(board._id, value || null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      layout
      className="group bg-surface-container-low rounded-2xl border border-outline-variant/20 overflow-hidden flex flex-col"
    >
      <button onClick={onOpen} className="flex-1 flex flex-col text-left p-5">
        <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center mb-3">
          <FileText size={18} />
        </div>
        <p className="text-sm font-semibold text-on-surface truncate">{board.title}</p>
        <p className="text-xs text-on-surface/40 mt-1 line-clamp-2 min-h-[2rem]">
          {board.description || 'No description'}
        </p>
        <div className="flex items-center gap-3 mt-3 text-[11px] text-on-surface/30">
          <span>{board.actions?.length || 0} elements</span>
          <span>·</span>
          <span>{timeAgo(board.updatedAt)}</span>
          {!isOwner && board.owner?.name && (
            <>
              <span>·</span>
              <span className="truncate">by {board.owner.name}</span>
            </>
          )}
        </div>
      </button>
      <div className="flex items-center gap-1 px-3 pb-3">
        <button
          onClick={onOpen}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary-container/60 text-on-primary-container rounded-xl text-xs font-semibold hover:bg-primary-container transition-colors"
        >
          <ExternalLink size={13} /> Open
        </button>
        {isOwner ? (
          <>
            <button
              onClick={onShare}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-on-surface/50 hover:bg-surface-container hover:text-on-surface transition-colors"
              title="Share"
            >
              <Share2 size={15} />
            </button>
            <div className="relative" title="Move to notebook">
              <Layers size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface/40 pointer-events-none" />
              <select
                value={String(board.notebook || '')}
                onChange={handleMove}
                disabled={busy}
                className="pl-8 pr-2 h-9 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-xs text-on-surface/70 outline-none cursor-pointer disabled:opacity-50"
              >
                <option value="">No notebook</option>
                {notebooks.map((n) => (
                  <option key={n._id} value={n._id}>{n.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={onDelete}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-on-surface/30 hover:bg-error-container hover:text-error transition-colors"
              title="Delete"
            >
              <Trash2 size={15} />
            </button>
          </>
        ) : (
          <span className="text-[10px] px-2 py-1 rounded-lg bg-tertiary-container/60 text-on-tertiary-container font-medium">
            Viewer
          </span>
        )}
      </div>
    </motion.div>
  )
}
