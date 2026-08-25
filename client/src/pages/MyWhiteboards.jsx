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
  Search,
  X,
  ExternalLink,
  Layers,
  Loader2,
} from 'lucide-react'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import ShareWhiteboardModal from '../components/whiteboard/ShareWhiteboardModal'
import { SkeletonCard } from '../components/common/Skeleton'
import ConfirmationModal from '../components/common/ConfirmationModal'

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
  const [boardError, setBoardError] = useState('')

  const [createNotebookOpen, setCreateNotebookOpen] = useState(false)
  const [notebookName, setNotebookName] = useState('')
  const [creatingNotebook, setCreatingNotebook] = useState(false)
  const [notebookError, setNotebookError] = useState('')
  const [shareBoard, setShareBoard] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [search, setSearch] = useState('')

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

  const q = search.trim().toLowerCase()
  const matchBoard = (b) =>
    !q ||
    b.title?.toLowerCase().includes(q) ||
    b.description?.toLowerCase().includes(q)

  const ownedBoards = boards.filter((b) => String(b.owner?._id || b.owner) === myId)
  const shared = boards.filter((b) => String(b.owner?._id || b.owner) !== myId).filter(matchBoard)
  const owned = ownedBoards.filter(matchBoard)
  const unfiled = owned.filter((b) => !b.notebook)
  const visibleNotebooks = notebooks.filter(
    (nb) =>
      !q ||
      nb.name?.toLowerCase().includes(q) ||
      ownedBoards.some((b) => String(b.notebook) === String(nb._id) && matchBoard(b))
  )
  const searchEmpty =
    q &&
    !shared.length &&
    !owned.length &&
    !visibleNotebooks.length

  const openCreateBoard = () => {
    setBoardError('')
    setCreateBoardOpen(true)
  }

  const openCreateNotebook = () => {
    setNotebookError('')
    setCreateNotebookOpen(true)
  }

  const handleCreateBoard = async (e) => {
    e.preventDefault()
    if (!boardTitle.trim()) return
    setCreatingBoard(true)
    setBoardError('')
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
      if (!data.whiteboard.pending) {
        navigate(`/whiteboards/${data.whiteboard._id}`)
      }
    } catch (err) {
      setBoardError(err.message || 'Failed to create whiteboard')
    } finally {
      setCreatingBoard(false)
    }
  }

  const handleCreateNotebook = async (e) => {
    e.preventDefault()
    if (!notebookName.trim()) return
    setCreatingNotebook(true)
    setNotebookError('')
    try {
      const data = await api.createNotebook(notebookName.trim())
      setNotebooks((prev) => [data.notebook, ...prev])
      setNotebookName('')
      setCreateNotebookOpen(false)
    } catch (err) {
      setNotebookError(err.message || 'Failed to create notebook')
    } finally {
      setCreatingNotebook(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return
    const { type, id } = deleteConfirm
    setDeleting(true)
    try {
      if (type === 'notebook') {
        await api.deleteNotebook(id)
        setNotebooks((prev) => prev.filter((n) => n._id !== id))
        setBoards((prev) => prev.map((b) => (String(b.notebook) === String(id) ? { ...b, notebook: null } : b)))
      } else {
        await api.deleteWhiteboard(id)
        setBoards((prev) => prev.filter((b) => b._id !== id))
      }
      setDeleteConfirm(null)
    } catch (err) {
      alert(err.message)
    } finally {
      setDeleting(false)
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
    'w-full px-4 py-2.5 rounded-lg border border-white/15 bg-white/5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#0f71ef] transition-colors'

  return (
    <div className="min-h-screen bg-[#1e1c26]">
      <div className="p-6 md:p-12 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">My Whiteboards</h1>
            <p className="text-white/40 text-sm">Create boards, organize them into notebooks, and share with others.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openCreateNotebook()}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 text-white rounded-lg text-sm font-semibold hover:bg-white/10 transition-colors"
            >
              <Folder size={16} /> New Notebook
            </button>
            <button
              onClick={() => openCreateBoard()}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0f71ef] text-white rounded-lg text-sm font-semibold hover:bg-[#0d62cc] transition-colors"
            >
              <Plus size={16} /> New Whiteboard
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-400 mb-6">{error}</p>}

        {!loading && (
          <div className="relative mb-8 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search whiteboards and notebooks..."
              className="w-full pl-10 pr-9 py-2.5 rounded-lg border border-white/15 bg-white/5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#0f71ef] transition-colors"
            />
            {q && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {searchEmpty && (
          <p className="text-sm text-white/40 mb-6">
            No whiteboards or notebooks match "{search.trim()}".
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <div className="space-y-10">
            {shared.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Share2 size={16} className="text-white/40" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Shared with me</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {shared.map((wb) => (
                    <BoardCard
                      key={wb._id}
                      board={wb}
                      isOwner={false}
                      onOpen={() => navigate(`/whiteboards/${wb._id}`)}
                      onDelete={() => setDeleteConfirm({ type: 'board', id: wb._id })}
                    />
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="flex items-center gap-2 mb-4">
                <Folder size={16} className="text-white/40" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Notebooks</h2>
              </div>
              {visibleNotebooks.length === 0 ? (
                q ? null : (
                  <button
                    onClick={() => openCreateNotebook()}
                    className="w-full border-2 border-dashed border-white/20 rounded-xl p-6 flex items-center justify-center gap-2 text-white/30 hover:border-[#0f71ef] hover:text-[#0f71ef] transition-colors"
                  >
                    <Folder size={18} /> Create your first notebook to organize boards
                  </button>
                )
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visibleNotebooks.map((nb) => {
                    const nbBoards = owned.filter((b) => String(b.notebook) === String(nb._id))
                    return (
                      <div
                        key={nb._id}
                        className="bg-[#2b2935] rounded-xl border border-white/10 overflow-hidden"
                      >
                        <div className="flex items-center gap-3 px-4 py-3">
                          <div className="w-9 h-9 rounded-lg bg-white/10 text-white flex items-center justify-center shrink-0">
                            <Folder size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{nb.name}</p>
                            <p className="text-[11px] text-white/40">{nbBoards.length} board{nbBoards.length !== 1 ? 's' : ''}</p>
                          </div>
                          <button
                            onClick={() => setDeleteConfirm({ type: 'notebook', id: nb._id })}
                            className="text-white/30 hover:text-red-400 transition-colors shrink-0"
                            title="Delete notebook"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="px-3 pb-3 space-y-2">
                          {nbBoards.map((wb) => (
                            <div
                              key={wb._id}
                              className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/5 border border-white/10 hover:border-[#0f71ef] cursor-pointer transition-colors"
                              onClick={() => navigate(`/whiteboards/${wb._id}`)}
                            >
                              <FileText size={14} className="text-white/30 shrink-0" />
                              <p className="flex-1 text-xs font-medium text-white truncate">{wb.title}</p>
                              <span className="text-[10px] text-white/30 shrink-0">{wb.actions?.length || 0}</span>
                            </div>
                          ))}
                          {nbBoards.length === 0 && (
                            <p className="text-xs text-white/25 px-1 py-1">No boards yet — add one below.</p>
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
                <PenTool size={16} className="text-white/40" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Whiteboards</h2>
              </div>
              {unfiled.length === 0 ? (
                q ? null : (
                  <button
                    onClick={() => openCreateBoard()}
                    className="w-full border-2 border-dashed border-white/20 rounded-xl p-6 flex items-center justify-center gap-2 text-white/30 hover:border-[#0f71ef] hover:text-[#0f71ef] transition-colors"
                  >
                    <Plus size={18} /> Create your first whiteboard
                  </button>
                )
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unfiled.map((wb) => (
                    <BoardCard
                      key={wb._id}
                      board={wb}
                      isOwner
                      notebooks={notebooks}
                      onOpen={() => navigate(`/whiteboards/${wb._id}`)}
                      onDelete={() => setDeleteConfirm({ type: 'board', id: wb._id })}
                      onShare={() => setShareBoard(wb)}
                      onMove={handleMove}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Create whiteboard modal */}
      <AnimatePresence>
        {createBoardOpen && (
          <Modal title="New Whiteboard" onClose={() => setCreateBoardOpen(false)}>
            <form onSubmit={handleCreateBoard} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Title</label>
                <input autoFocus value={boardTitle} onChange={(e) => setBoardTitle(e.target.value)} placeholder="e.g. Calculus Revision" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Description (optional)</label>
                <input value={boardDesc} onChange={(e) => setBoardDesc(e.target.value)} placeholder="What is this board for?" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Notebook (optional)</label>
                <select value={boardNotebook} onChange={(e) => setBoardNotebook(e.target.value)} className={inputCls}>
                  <option value="">No notebook</option>
                  {notebooks.map((n) => (
                    <option key={n._id} value={n._id}>{n.name}</option>
                  ))}
                </select>
              </div>
              {boardError && <p className="text-xs text-red-400">{boardError}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setCreateBoardOpen(false)} className="px-4 py-2.5 text-sm text-white/50 hover:bg-white/10 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={!boardTitle.trim() || creatingBoard} className="px-5 py-2.5 bg-[#0f71ef] text-white rounded-lg text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2 hover:bg-[#0d62cc] transition-colors">
                  {creatingBoard ? (<><Loader2 size={15} className="animate-spin" /> Creating...</>) : 'Create Board'}
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
                <label className="block text-xs font-medium text-white/50 mb-1.5">Name</label>
                <input autoFocus value={notebookName} onChange={(e) => setNotebookName(e.target.value)} placeholder="e.g. Chemistry" className={inputCls} />
              </div>
              {notebookError && <p className="text-xs text-red-400">{notebookError}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setCreateNotebookOpen(false)} className="px-4 py-2.5 text-sm text-white/50 hover:bg-white/10 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={!notebookName.trim() || creatingNotebook} className="px-5 py-2.5 bg-[#0f71ef] text-white rounded-lg text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2 hover:bg-[#0d62cc] transition-colors">
                  {creatingNotebook ? (<><Loader2 size={15} className="animate-spin" /> Creating...</>) : 'Create Notebook'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {shareBoard && <ShareWhiteboardModal board={shareBoard} onClose={() => setShareBoard(null)} />}
      </AnimatePresence>

      <ConfirmationModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
        title={deleteConfirm?.type === 'notebook' ? 'Delete Notebook' : 'Delete Whiteboard'}
        message={
          deleteConfirm?.type === 'notebook'
            ? 'This notebook will be deleted. Its whiteboards will be moved to the main list.'
            : 'This whiteboard will be permanently deleted. This cannot be undone.'
        }
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-full max-w-[28rem] bg-[#2b2935] rounded-xl border border-white/10 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:bg-white/10 transition-colors">
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
      className="group bg-[#2b2935] rounded-xl border border-white/10 overflow-hidden flex flex-col"
    >
      <button onClick={onOpen} className="flex-1 flex flex-col text-left p-5">
        <div className="w-10 h-10 rounded-lg bg-white/10 text-white flex items-center justify-center mb-3">
          <FileText size={18} />
        </div>
        <p className="text-sm font-semibold text-white truncate">{board.title}</p>
        <p className="text-xs text-white/40 mt-1 line-clamp-2 min-h-[2rem]">
          {board.description || 'No description'}
        </p>
        <div className="flex items-center gap-3 mt-3 text-[11px] text-white/30">
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
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#0f71ef]/20 text-[#0f71ef] rounded-lg text-xs font-semibold hover:bg-[#0f71ef]/30 transition-colors"
        >
          <ExternalLink size={13} /> Open
        </button>
        {isOwner ? (
          <>
            <button
              onClick={onShare}
              aria-label="Share"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors"
              title="Share"
            >
              <Share2 size={15} />
            </button>
            <div className="relative" title="Move to notebook">
              <Layers size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
              <select
                value={String(board.notebook || '')}
                onChange={handleMove}
                disabled={busy}
                className="pl-8 pr-2 h-9 rounded-lg border border-white/15 bg-white/5 text-xs text-white/70 outline-none cursor-pointer disabled:opacity-50"
              >
                <option value="">No notebook</option>
                {notebooks.map((n) => (
                  <option key={n._id} value={n._id}>{n.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={onDelete}
              aria-label="Delete"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white/30 hover:bg-red-500/20 hover:text-red-400 transition-colors"
              title="Delete"
            >
              <Trash2 size={15} />
            </button>
          </>
        ) : (
          <span className="text-[10px] px-2 py-1 rounded-md bg-white/10 text-white/60 font-medium">
            {board.myRole === 'editor' || board.myRole === 'link-editor' ? 'Editor' : 'Viewer'}
          </span>
        )}
      </div>
    </motion.div>
  )
}
