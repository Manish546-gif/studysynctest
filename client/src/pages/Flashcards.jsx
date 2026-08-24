import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../services/api'
import { Link } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Pencil, Trash2, Trophy, BookOpen, Clock, AlertCircle } from 'lucide-react'

const QUALITY_LABELS = [
  { value: 0, label: 'Again', color: 'bg-error text-on-error' },
  { value: 1, label: 'Hard', color: 'bg-orange-500 text-white' },
  { value: 2, label: 'Good', color: 'bg-amber-500 text-white' },
  { value: 3, label: 'Easy', color: 'bg-success text-on-primary' },
  { value: 4, label: 'Great', color: 'bg-primary text-on-primary' },
  { value: 5, label: 'Perfect', color: 'bg-secondary text-on-secondary' },
]

export default function Flashcards() {
  const [flashcards, setFlashcards] = useState([])
  const [dueCards, setDueCards] = useState([])
  const [stats, setStats] = useState(null)
  const [mode, setMode] = useState('list')
  const [currentIdx, setCurrentIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [editId, setEditId] = useState(null)

  const loadData = useCallback(async () => {
    try {
      const [allRes, dueRes, statsRes] = await Promise.all([
        api.getFlashcards(),
        api.getDueFlashcards(),
        api.getFlashcardStats(),
      ])
      setFlashcards(allRes.flashcards || [])
      setDueCards(dueRes.flashcards || [])
      setStats(statsRes)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const reviewCard = async (quality) => {
    if (!dueCards[currentIdx]) return
    try {
      await api.reviewFlashcard(dueCards[currentIdx]._id, quality)
      setFlipped(false)
      if (currentIdx < dueCards.length - 1) {
        setCurrentIdx(currentIdx + 1)
      } else {
        setMode('list')
        loadData()
      }
    } catch {}
  }

  const saveCard = async () => {
    if (!front.trim() || !back.trim()) return
    try {
      if (editId) {
        await api.updateFlashcard(editId, { front, back })
      } else {
        await api.createFlashcard({ front, back })
      }
      setFront('')
      setBack('')
      setEditId(null)
      loadData()
    } catch {}
  }

  const deleteCard = async (id) => {
    if (!confirm('Delete this flashcard?')) return
    await api.deleteFlashcard(id)
    loadData()
  }

  const editCard = (card) => {
    setFront(card.front)
    setBack(card.back)
    setEditId(card._id)
    setMode('create')
  }

  const startReview = () => {
    if (dueCards.length === 0) return
    setCurrentIdx(0)
    setFlipped(false)
    setMode('review')
  }

  if (loading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-container border-t-primary rounded-full animate-spin" />
    </div>
  )

  const currentCard = dueCards[currentIdx]

  return (
    <div className="min-h-screen bg-surface text-on-surface p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Flashcards</h1>
        <p className="text-on-surface/60 mb-8">Spaced repetition to help you remember</p>

        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-surface-container-low rounded-2xl p-4 text-center border border-outline-variant/20">
              <BookOpen size={20} className="text-on-surface/40 mx-auto mb-2" />
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-on-surface/60">Total Cards</div>
            </div>
            <div className="bg-surface-container-low rounded-2xl p-4 text-center border border-outline-variant/20">
              <Clock size={20} className="text-orange-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-500">{stats.due}</div>
              <div className="text-sm text-on-surface/60">Due Today</div>
            </div>
            <div className="bg-surface-container-low rounded-2xl p-4 text-center border border-outline-variant/20">
              <Trophy size={20} className="text-success mx-auto mb-2" />
              <div className="text-2xl font-bold text-success">{stats.mastered}</div>
              <div className="text-sm text-on-surface/60">Mastered</div>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          {['list', 'review', 'create'].map((m) => (
            <button key={m} onClick={() => { setMode(m); setEditId(null); setFront(''); setBack('') }}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition ${
                mode === m ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface/60 hover:bg-surface-container'
              }`}>
              {m === 'create' && editId ? 'Edit Card' : m}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {mode === 'review' && currentCard && (
            <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-4 text-sm text-on-surface/60">
                Card {currentIdx + 1} of {dueCards.length}
              </div>
              <div
                className="bg-surface-container-low rounded-2xl shadow-sm p-12 min-h-[300px] flex items-center justify-center cursor-pointer select-none mb-6 border border-outline-variant/20"
                onClick={() => setFlipped(!flipped)}
              >
                <div className="text-center">
                  <div className="text-xs text-on-surface/40 mb-4 uppercase tracking-wider">{flipped ? 'Answer' : 'Question'}</div>
                  <div className="text-xl font-medium whitespace-pre-wrap">
                    {flipped ? currentCard.back : currentCard.front}
                  </div>
                  {!flipped && <div className="text-sm text-on-surface/40 mt-6">Click to reveal answer</div>}
                </div>
              </div>
              {flipped && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-6 gap-2">
                  {QUALITY_LABELS.map((q) => (
                    <button key={q.value} onClick={() => reviewCard(q.value)}
                      className={`py-3 rounded-xl font-medium text-sm transition ${q.color}`}>
                      {q.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}

          {mode === 'review' && !currentCard && (
            <motion.div key="empty-review" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center py-16 bg-surface-container-low rounded-2xl border border-outline-variant/20">
              <RotateCcw size={40} className="text-success mx-auto mb-4" />
              <div className="text-xl font-bold mb-2">All caught up!</div>
              <div className="text-on-surface/60">No cards due for review right now.</div>
              <button onClick={() => setMode('list')} className="mt-4 px-6 py-2 bg-primary text-on-primary rounded-xl font-medium">
                Back to Cards
              </button>
            </motion.div>
          )}

          {mode === 'create' && (
            <motion.div key="create" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="bg-surface-container-low rounded-2xl border border-outline-variant/20 p-6">
                <h2 className="text-lg font-bold mb-4">{editId ? 'Edit Flashcard' : 'New Flashcard'}</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-on-surface/60 block mb-1">Front (Question)</label>
                    <textarea value={front} onChange={(e) => setFront(e.target.value)}
                      className="w-full bg-surface border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary h-24 resize-none"
                      placeholder="What do you want to learn?" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-on-surface/60 block mb-1">Back (Answer)</label>
                    <textarea value={back} onChange={(e) => setBack(e.target.value)}
                      className="w-full bg-surface border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary h-24 resize-none"
                      placeholder="The answer is..." />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={saveCard} disabled={!front.trim() || !back.trim()}
                      className="px-6 py-2 bg-primary text-on-primary rounded-xl font-medium disabled:opacity-50 transition">
                      {editId ? 'Update' : 'Add Card'}
                    </button>
                    {editId && (
                      <button onClick={() => { setEditId(null); setFront(''); setBack(''); setMode('list') }}
                        className="px-6 py-2 bg-surface-container text-on-surface/60 rounded-xl font-medium hover:bg-surface-container-high transition">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {mode === 'list' && (
            <motion.div key="list" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {dueCards.length > 0 && (
                <button onClick={startReview}
                  className="w-full mb-6 py-4 bg-primary text-on-primary rounded-2xl font-bold text-lg hover:bg-primary/90 transition shadow-lg flex items-center justify-center gap-2">
                  <RotateCcw size={20} />
                  Review {dueCards.length} Due Card{dueCards.length !== 1 ? 's' : ''}
                </button>
              )}

              {flashcards.length === 0 ? (
                <div className="text-center py-16 bg-surface-container-low rounded-2xl border border-outline-variant/20">
                  <BookOpen size={40} className="text-on-surface/20 mx-auto mb-4" />
                  <div className="text-xl font-bold mb-2">No flashcards yet</div>
                  <div className="text-on-surface/60 mb-4">Create your first flashcard to start learning</div>
                  <button onClick={() => setMode('create')} className="px-6 py-2 bg-primary text-on-primary rounded-xl font-medium">
                    Create Flashcard
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {flashcards.map((card) => (
                    <div key={card._id} className="bg-surface-container-low rounded-xl p-4 flex items-start justify-between border border-outline-variant/20">
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="font-medium text-on-surface truncate">{card.front}</div>
                        <div className="text-sm text-on-surface/50 truncate">{card.back}</div>
                        <div className="flex gap-3 mt-1 text-xs text-on-surface/40">
                          {card.isMastered && <span className="text-success font-medium">Mastered</span>}
                          <span>EF: {card.easeFactor.toFixed(1)}</span>
                          <span>Interval: {card.interval}d</span>
                          {card.nextReview && <span>Next: {new Date(card.nextReview).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => editCard(card)}
                          className="p-2 hover:bg-surface-container rounded-lg text-on-surface/40 hover:text-on-surface transition">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => deleteCard(card._id)}
                          className="p-2 hover:bg-error/10 rounded-lg text-on-surface/40 hover:text-error transition">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <Link to="/dashboard" className="inline-flex items-center gap-1 mt-8 text-primary hover:text-primary/80 transition">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
