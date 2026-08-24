import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquarePlus, X, Trash2, Send } from 'lucide-react'

function timeAgo(value) {
  const diff = Date.now() - new Date(value).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export default function CommentLayer({
  comments = [],
  participants = [],
  currentUserId,
  isOwner,
  onAdd,
  onDelete,
}) {
  const [mode, setMode] = useState(false)
  const [draftPos, setDraftPos] = useState(null) // {x, y} in percent
  const [draftText, setDraftText] = useState('')
  const [openPin, setOpenPin] = useState(null) // comment _id
  const [posting, setPosting] = useState(false)
  const layerRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setDraftPos(null)
        setOpenPin(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleLayerClick = (e) => {
    if (!mode || e.target.closest('[data-comment-pin]') || e.target.closest('[data-comment-composer]')) return
    const rect = layerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setOpenPin(null)
    setDraftText('')
    setDraftPos({ x, y })
  }

  const submitDraft = async () => {
    const text = draftText.trim()
    if (!text || !draftPos || posting) return
    setPosting(true)
    try {
      await onAdd({ text, x: draftPos.x, y: draftPos.y })
      setDraftPos(null)
      setDraftText('')
      setMode(false)
    } catch (err) {
      alert(err.message)
    } finally {
      setPosting(false)
    }
  }

  const renderMentions = (text) => {
    const names = participants
      .filter((p) => p.name)
      .flatMap((p) => {
        const full = p.name.trim()
        return [full, full.split(/\s+/)[0]]
      })
      .filter(Boolean)
    const all = [...new Set(names)].sort((a, b) => b.length - a.length).map(escapeRegex)
    if (!all.length) return text
    const re = new RegExp(`(@(?:${all.join('|')}))`, 'gi')
    return text.split(re).map((part, i) =>
      part.startsWith('@') && re.test(part) ? (
        <span key={i} className="font-semibold text-primary">{part}</span>
      ) : (
        part
      )
    )
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => { setMode((m) => !m); setDraftPos(null); setOpenPin(null) }}
        className={`absolute bottom-4 left-4 z-30 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors ${
          mode
            ? 'bg-primary text-on-primary'
            : 'bg-surface-container-high/90 text-on-surface hover:bg-surface-container-high'
        }`}
        title={mode ? 'Exit comment mode' : 'Add comments (click anywhere on the board)'}
      >
        <MessageSquarePlus size={14} /> {mode ? 'Done' : 'Comments'}
      </button>

      {/* Pin layer */}
      <div
        ref={layerRef}
        onClick={handleLayerClick}
        className={`absolute inset-0 z-20 ${mode ? 'cursor-crosshair' : 'pointer-events-none'}`}
      >
        {comments.map((c) => {
          const isOpen = openPin === c._id
          const canDelete = String(c.user?._id || c.user) === currentUserId || isOwner
          return (
            <div
              key={c._id}
              data-comment-pin
              className="absolute"
              style={{ left: `${c.x}%`, top: `${c.y}%` }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); setOpenPin(isOpen ? null : c._id); setDraftPos(null) }}
                className={`w-7 h-7 -translate-x-1/2 -translate-y-full rounded-full rounded-bl-sm flex items-center justify-center shadow-md transition-transform hover:scale-110 ${
                  isOpen ? 'bg-primary text-on-primary' : 'bg-secondary-container text-on-secondary-container'
                }`}
                title={`Comment by ${c.userName}`}
              >
                <span className="text-[10px] font-bold">
                  {(c.userName || '?').charAt(0).toUpperCase()}
                </span>
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 4 }}
                    transition={{ duration: 0.12 }}
                    data-comment-pin
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-2 w-56 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-lg p-3 z-40"
                    style={{
                      left: 0,
                      transform: `translateX(${c.x > 70 ? '-90%' : c.x < 15 ? '-10%' : '-50%'})`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-on-surface truncate">{c.userName}</p>
                        <p className="text-[10px] text-on-surface/35">{timeAgo(c.createdAt)}</p>
                      </div>
                      {canDelete && (
                        <button
                          onClick={() => {
                            if (!confirm('Delete this comment?')) return
                            onDelete(c._id).catch((err) => alert(err.message))
                            setOpenPin(null)
                          }}
                          className="text-on-surface/30 hover:text-error transition-colors shrink-0"
                          title="Delete comment"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-on-surface/80 whitespace-pre-wrap break-words leading-relaxed">
                      {renderMentions(c.text)}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}

        {/* Draft composer */}
        <AnimatePresence>
          {draftPos && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              data-comment-composer
              className="absolute w-64 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-lg p-3 z-40"
              style={{
                left: `${draftPos.x}%`,
                top: `${draftPos.y}%`,
                transform: `translate(${draftPos.x > 70 ? '-90%' : draftPos.x < 15 ? '-10%' : '-50%'}, 8px)`,
              }}
            >
              <textarea
                autoFocus
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitDraft()
                }}
                placeholder="Add a comment... use @name to mention"
                rows={3}
                className="w-full text-xs text-on-surface placeholder:text-on-surface/25 bg-transparent outline-none resize-none"
              />
              <div className="flex items-center justify-between mt-2">
                {participants.length > 0 && (
                  <div className="flex gap-1 overflow-hidden max-w-[55%]">
                    {participants.slice(0, 3).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setDraftText((t) => `${t}${t && !t.endsWith(' ') ? ' ' : ''}@${(p.name || '').split(/\s+/)[0]} `)}
                        className="px-1.5 py-0.5 rounded-md bg-surface-container text-[10px] font-medium text-on-surface/60 hover:bg-secondary-container hover:text-on-secondary-container transition-colors truncate"
                      >
                        @{(p.name || '').split(/\s+/)[0]}
                      </button>
                    ))}
                  </div>
                )}
                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    onClick={() => setDraftPos(null)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface/40 hover:bg-surface-container transition-colors"
                    title="Cancel (Esc)"
                  >
                    <X size={14} />
                  </button>
                  <button
                    onClick={submitDraft}
                    disabled={!draftText.trim() || posting}
                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary text-on-primary disabled:opacity-40"
                    title="Post comment"
                  >
                    <Send size={13} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
