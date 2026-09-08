import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Folder, FileText, PenTool, Trash2, Share2,
  Search, X, ExternalLink, Layers, Loader2, BookOpen, Clock, Sparkles
} from 'lucide-react'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
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

function BoardCard({ board, isOwner, onOpen, onDelete, onShare, onMove, notebooks = [] }) {
  const [moving, setMoving] = useState(false)
  const actionCount = board.actions?.length || 0

  return (
    <div
      className="kick-card group"
      style={{
        background: '#16191e',
        border: '1px solid #2a2d33',
        borderRadius: 10,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Canvas Thumbnail Preview */}
      <div
        onClick={onOpen}
        style={{
          height: 120,
          background: '#0e0f13',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', cursor: 'pointer',
        }}
      >
        <PenTool size={32} style={{ color: '#53fc18', opacity: 0.8 }} />
        <div style={{
          position: 'absolute', top: 10, right: 10,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: '#53fc18',
        }}>
          {actionCount} Actions
        </div>
      </div>

      {/* Card Content */}
      <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h3 onClick={onOpen} style={{ fontSize: 15, fontWeight: 700, color: '#e8eaed', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="hover:text-[#53fc18] transition-colors">
              {board.title || 'Untitled Board'}
            </h3>
          </div>
          <p style={{ fontSize: 12, color: '#808a93', marginBottom: 12, lineHeight: 1.3, height: 32, overflow: 'hidden' }}>
            {board.description || 'Interactive collaborative whiteboard canvas.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #2a2d33' }}>
          <span style={{ fontSize: 11, color: '#808a93', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} /> {timeAgo(board.updatedAt)}
          </span>

          <div style={{ display: 'flex', items: 'center', gap: 6 }}>
            {onShare && (
              <button onClick={onShare} style={{ background: '#0e0f13', border: '1px solid #2a2d33', borderRadius: 6, padding: '5px 8px', color: '#53fc18', cursor: 'pointer' }} title="Share Board">
                <Share2 size={13} />
              </button>
            )}
            {isOwner && onDelete && (
              <button onClick={onDelete} style={{ background: '#0e0f13', border: '1px solid #2a2d33', borderRadius: 6, padding: '5px 8px', color: '#ff6b6b', cursor: 'pointer' }} title="Delete Board">
                <Trash2 size={13} />
              </button>
            )}
            <button onClick={onOpen} className="btn-kick" style={{ fontSize: 12, padding: '5px 12px' }}>
              Open
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MyWhiteboards() {
  const { user } = useAuth()
  const { toast } = useToast()
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
  const visibleNotebooks = notebooks.filter(
    (nb) =>
      !q ||
      nb.name?.toLowerCase().includes(q) ||
      ownedBoards.some((b) => String(b.notebook) === String(nb._id) && matchBoard(b))
  )

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
      setBoardTitle(''); setBoardDesc(''); setBoardNotebook('')
      setCreateBoardOpen(false)
      toast('Whiteboard created!', 'success')
      navigate(`/whiteboards/${data.whiteboard._id}`)
    } catch (err) {
      toast(err.message || 'Failed to create whiteboard', 'error')
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
      setNotebooks((prev) => [...prev, data.notebook])
      setNotebookName('')
      setCreateNotebookOpen(false)
      toast('Notebook created!', 'success')
    } catch (err) {
      toast(err.message || 'Failed to create notebook', 'error')
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
        toast('Notebook deleted', 'info')
      } else {
        await api.deleteWhiteboard(id)
        setBoards((prev) => prev.filter((b) => b._id !== id))
        toast('Whiteboard deleted', 'info')
      }
      setDeleteConfirm(null)
    } catch (err) {
      toast(err.message || 'Deletion failed', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div style={{ background: '#0e0f13', minHeight: '100vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e8eaed', margin: 0 }}>
              My Whiteboards & Notebooks
            </h1>
            <p style={{ fontSize: 13, color: '#808a93', marginTop: 4 }}>
              Collaborative drawing canvases, study diagrams, and organized notebooks.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setCreateNotebookOpen(true)}
              className="btn-kick-outline"
            >
              <Folder size={16} /> New Notebook
            </button>
            <button
              onClick={() => setCreateBoardOpen(true)}
              className="btn-kick"
            >
              <Plus size={16} /> New Whiteboard
            </button>
          </div>
        </div>

        {/* Search */}
        {!loading && (
          <div style={{ position: 'relative', marginBottom: 24, maxWidth: 440 }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#808a93' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search whiteboards and notebooks..."
              style={{
                width: '100%', background: '#16191e', border: '1px solid #2a2d33', borderRadius: 8,
                padding: '10px 14px 10px 40px', fontSize: 14, color: '#e8eaed', outline: 'none',
              }}
            />
            {q && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#808a93', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* Shared With Me */}
            {shared.length > 0 && (
              <section>
                <h2 style={{ fontSize: 14, fontWeight: 800, color: '#53fc18', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Share2 size={16} /> Shared With Me
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {shared.map((wb) => (
                    <BoardCard
                      key={wb._id}
                      board={wb}
                      isOwner={false}
                      onOpen={() => navigate(`/whiteboards/${wb._id}`)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Notebooks Grid */}
            <section>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: '#808a93', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Folder size={16} style={{ color: '#53fc18' }} /> Notebooks ({visibleNotebooks.length})
              </h2>

              {visibleNotebooks.length === 0 ? (
                <div style={{ background: '#16191e', border: '1px border-dashed #2a2d33', borderRadius: 12, padding: 24, textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: '#808a93' }}>No notebooks created yet. Group related whiteboards into notebooks!</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {visibleNotebooks.map((nb) => {
                    const nbBoards = owned.filter((b) => String(b.notebook) === String(nb._id))
                    return (
                      <div
                        key={nb._id}
                        style={{ background: '#16191e', border: '1px solid #2a2d33', borderRadius: 10, padding: 16 }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#1a3a0a', color: '#53fc18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Folder size={18} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e8eaed', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {nb.name}
                            </h3>
                            <p style={{ fontSize: 11, color: '#808a93', margin: '2px 0 0' }}>{nbBoards.length} Whiteboards</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                              onClick={() => {
                                if (nbBoards.length > 0) {
                                  setShareBoard(nbBoards[0])
                                } else {
                                  navigator.clipboard.writeText(window.location.href)
                                  toast('Notebook link copied to clipboard!', 'info')
                                }
                              }}
                              style={{ background: 'none', border: 'none', color: '#53fc18', cursor: 'pointer', padding: 4 }}
                              className="hover:opacity-80"
                              title="Share Notebook"
                            >
                              <Share2 size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ type: 'notebook', id: nb._id })}
                              style={{ background: 'none', border: 'none', color: '#808a93', cursor: 'pointer', padding: 4 }}
                              className="hover:text-[#ff4f4f]"
                              title="Delete Notebook"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}


                </div>
              )}
            </section>

            {/* Owned Whiteboards */}
            <section>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: '#808a93', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <PenTool size={16} style={{ color: '#53fc18' }} /> My Canvases ({owned.length})
              </h2>

              {owned.length === 0 ? (
                <div style={{ background: '#16191e', border: '1px solid #2a2d33', borderRadius: 12, padding: 40, textAlign: 'center' }}>
                  <PenTool size={32} style={{ color: '#808a93', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 14, color: '#e8eaed', fontWeight: 600 }}>No whiteboards created yet</p>
                  <button onClick={() => setCreateBoardOpen(true)} className="btn-kick" style={{ margin: '16px auto 0' }}>
                    + Create First Whiteboard
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {owned.map((wb) => (
                    <BoardCard
                      key={wb._id}
                      board={wb}
                      isOwner={true}
                      onOpen={() => navigate(`/whiteboards/${wb._id}`)}
                      onShare={() => setShareBoard(wb)}
                      onDelete={() => setDeleteConfirm({ type: 'board', id: wb._id })}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {/* Create Board Modal */}
        {createBoardOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCreateBoardOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50 }} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16 }}>
              <div style={{ background: '#16191e', border: '1px solid #2a2d33', borderRadius: 12, width: '100%', maxWidth: 440, padding: 24 }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e8eaed', margin: 0 }}>Create New Whiteboard</h2>
                  <button onClick={() => setCreateBoardOpen(false)} style={{ background: 'none', border: 'none', color: '#808a93', cursor: 'pointer' }}><X size={18} /></button>
                </div>
                <form onSubmit={handleCreateBoard} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#808a93', display: 'block', marginBottom: 6 }}>Whiteboard Title</label>
                    <input autoFocus value={boardTitle} onChange={(e) => setBoardTitle(e.target.value)} placeholder="e.g. Physics Formula Diagram" style={{ width: '100%', background: '#0e0f13', border: '1px solid #3a4048', borderRadius: 6, padding: '10px 14px', fontSize: 14, color: '#e8eaed', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#808a93', display: 'block', marginBottom: 6 }}>Description (optional)</label>
                    <textarea rows={2} value={boardDesc} onChange={(e) => setBoardDesc(e.target.value)} placeholder="Notes or instructions..." style={{ width: '100%', background: '#0e0f13', border: '1px solid #3a4048', borderRadius: 6, padding: '10px 14px', fontSize: 14, color: '#e8eaed', outline: 'none', resize: 'none' }} />
                  </div>
                  <button type="submit" disabled={creatingBoard || !boardTitle.trim()} className="btn-kick" style={{ width: '100%', padding: 12 }}>
                    {creatingBoard ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    {creatingBoard ? 'Creating...' : 'Create Whiteboard'}
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}

        {/* Create Notebook Modal */}
        {createNotebookOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCreateNotebookOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50 }} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16 }}>
              <div style={{ background: '#16191e', border: '1px solid #2a2d33', borderRadius: 12, width: '100%', maxWidth: 400, padding: 24 }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e8eaed', margin: 0 }}>Create New Notebook</h2>
                  <button onClick={() => setCreateNotebookOpen(false)} style={{ background: 'none', border: 'none', color: '#808a93', cursor: 'pointer' }}><X size={18} /></button>
                </div>
                <form onSubmit={handleCreateNotebook} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#808a93', display: 'block', marginBottom: 6 }}>Notebook Name</label>
                    <input autoFocus value={notebookName} onChange={(e) => setNotebookName(e.target.value)} placeholder="e.g. Mathematics Notes" style={{ width: '100%', background: '#0e0f13', border: '1px solid #3a4048', borderRadius: 6, padding: '10px 14px', fontSize: 14, color: '#e8eaed', outline: 'none' }} />
                  </div>
                  <button type="submit" disabled={creatingNotebook || !notebookName.trim()} className="btn-kick" style={{ width: '100%', padding: 12 }}>
                    {creatingNotebook ? <Loader2 size={16} className="animate-spin" /> : <Folder size={16} />}
                    {creatingNotebook ? 'Creating...' : 'Create Notebook'}
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {shareBoard && (
        <ShareWhiteboardModal
          board={shareBoard}
          whiteboard={shareBoard}
          onClose={() => setShareBoard(null)}
          onUpdated={(updated) => setBoards((prev) => prev.map((b) => (b._id === updated._id ? updated : b)))}
        />
      )}


      <ConfirmationModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
        title={`Delete ${deleteConfirm?.type === 'notebook' ? 'Notebook' : 'Whiteboard'}`}
        message="Are you sure you want to delete this item?"
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  )
}
