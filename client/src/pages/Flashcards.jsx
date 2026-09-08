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
    <div className="min-h-screen bg-[#0e0f13] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#53fc18] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const currentCard = dueCards[currentIdx]

  return (
    <div className="min-h-screen bg-[#0e0f13] text-[#e8eaed] p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-[#e8eaed]">Flashcards</h1>
        <p className="text-[#9b9e9e] mb-8 text-sm">Spaced repetition to retain core knowledge efficiently</p>

        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-[#16191e] rounded-2xl p-5 text-center border border-[#2a2d33] shadow-lg">
              <BookOpen size={22} className="text-[#53fc18] mx-auto mb-2" />
              <div className="text-2xl font-extrabold text-[#e8eaed]">{stats.total}</div>
              <div className="text-xs font-semibold text-[#9b9e9e]">Total Cards</div>
            </div>
            <div className="bg-[#16191e] rounded-2xl p-5 text-center border border-[#2a2d33] shadow-lg">
              <Clock size={22} className="text-amber-400 mx-auto mb-2" />
              <div className="text-2xl font-extrabold text-amber-400">{stats.due}</div>
              <div className="text-xs font-semibold text-[#9b9e9e]">Due Today</div>
            </div>
            <div className="bg-[#16191e] rounded-2xl p-5 text-center border border-[#2a2d33] shadow-lg">
              <Trophy size={22} className="text-[#53fc18] mx-auto mb-2" />
              <div className="text-2xl font-extrabold text-[#53fc18]">{stats.mastered}</div>
              <div className="text-xs font-semibold text-[#9b9e9e]">Mastered</div>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          {['list', 'review', 'create'].map((m) => (
            <button key={m} onClick={() => { setMode(m); setEditId(null); setFront(''); setBack('') }}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold capitalize transition-all ${
                mode === m ? 'bg-[#53fc18] text-black shadow-[0_0_12px_rgba(83,252,24,0.3)]' : 'bg-[#16191e] text-[#9b9e9e] border border-[#2a2d33] hover:bg-[#20242b] hover:text-[#e8eaed]'
              }`}>
              {m === 'create' && editId ? 'Edit Card' : m}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {mode === 'review' && currentCard && (
            <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-4 text-xs font-mono font-bold text-[#9b9e9e]">
                Card {currentIdx + 1} of {dueCards.length}
              </div>
              <div
                className="bg-[#16191e] rounded-2xl shadow-xl p-12 min-h-[300px] flex items-center justify-center cursor-pointer select-none mb-6 border border-[#2a2d33] hover:border-[#53fc18]/50 transition-colors"
                onClick={() => setFlipped(!flipped)}
              >
                <div className="text-center">
                  <div className="text-xs font-bold text-[#53fc18] mb-4 uppercase tracking-widest">{flipped ? 'Answer' : 'Question'}</div>
                  <div className="text-2xl font-bold text-[#e8eaed] whitespace-pre-wrap leading-relaxed">
                    {flipped ? currentCard.back : currentCard.front}
                  </div>
                  {!flipped && <div className="text-xs text-[#9b9e9e]/60 mt-8">Click to reveal answer</div>}
                </div>
              </div>
              {flipped && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-6 gap-2">
                  {QUALITY_LABELS.map((q) => (
                    <button key={q.value} onClick={() => reviewCard(q.value)}
                      className={`py-3 rounded-xl font-bold text-xs transition ${q.color}`}>
                      {q.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}

          {mode === 'review' && !currentCard && (
            <motion.div key="empty-review" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center py-16 bg-[#16191e] rounded-2xl border border-[#2a2d33] shadow-xl">
              <RotateCcw size={40} className="text-[#53fc18] mx-auto mb-4" />
              <div className="text-xl font-bold text-[#e8eaed] mb-2">All caught up!</div>
              <div className="text-xs text-[#9b9e9e]">No cards due for review right now.</div>
              <button onClick={() => setMode('list')} className="mt-6 px-6 py-2.5 bg-[#53fc18] text-black rounded-xl font-bold text-xs hover:bg-[#48de13] transition">
                Back to Cards
              </button>
            </motion.div>
          )}

          {mode === 'create' && (
            <motion.div key="create" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="bg-[#16191e] rounded-2xl border border-[#2a2d33] p-6 shadow-xl">
                <h2 className="text-lg font-bold text-[#e8eaed] mb-4">{editId ? 'Edit Flashcard' : 'New Flashcard'}</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-[#9b9e9e] block mb-1.5 uppercase tracking-wider">Front (Question)</label>
                    <textarea value={front} onChange={(e) => setFront(e.target.value)}
                      className="w-full bg-[#0e0f13] border border-[#2a2d33] rounded-xl px-4 py-3 text-xs text-[#e8eaed] placeholder:text-[#9b9e9e]/50 focus:outline-none focus:border-[#53fc18] h-24 resize-none transition-colors"
                      placeholder="What do you want to learn?" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#9b9e9e] block mb-1.5 uppercase tracking-wider">Back (Answer)</label>
                    <textarea value={back} onChange={(e) => setBack(e.target.value)}
                      className="w-full bg-[#0e0f13] border border-[#2a2d33] rounded-xl px-4 py-3 text-xs text-[#e8eaed] placeholder:text-[#9b9e9e]/50 focus:outline-none focus:border-[#53fc18] h-24 resize-none transition-colors"
                      placeholder="The answer is..." />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={saveCard} disabled={!front.trim() || !back.trim()}
                      className="px-6 py-2.5 bg-[#53fc18] text-black rounded-xl font-bold text-xs hover:bg-[#48de13] disabled:opacity-40 transition shadow-md">
                      {editId ? 'Update Card' : 'Add Card'}
                    </button>
                    {editId && (
                      <button onClick={() => { setEditId(null); setFront(''); setBack(''); setMode('list') }}
                        className="px-6 py-2.5 bg-[#0e0f13] text-[#9b9e9e] border border-[#2a2d33] rounded-xl font-bold text-xs hover:bg-[#20242b] hover:text-[#e8eaed] transition">
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
                  className="w-full mb-6 py-4 bg-[#53fc18] text-black rounded-2xl font-extrabold text-base hover:bg-[#48de13] transition shadow-[0_0_20px_rgba(83,252,24,0.3)] flex items-center justify-center gap-2">
                  <RotateCcw size={20} />
                  Review {dueCards.length} Due Card{dueCards.length !== 1 ? 's' : ''}
                </button>
              )}

              {flashcards.length === 0 ? (
                <div className="text-center py-16 bg-[#16191e] rounded-2xl border border-[#2a2d33] shadow-xl">
                  <BookOpen size={40} className="text-[#9b9e9e]/30 mx-auto mb-4" />
                  <div className="text-xl font-bold text-[#e8eaed] mb-2">No flashcards yet</div>
                  <div className="text-xs text-[#9b9e9e] mb-6">Create your first flashcard to start learning</div>
                  <button onClick={() => setMode('create')} className="px-6 py-2.5 bg-[#53fc18] text-black rounded-xl font-bold text-xs hover:bg-[#48de13] transition">
                    Create Flashcard
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {flashcards.map((card) => (
                    <div key={card._id} className="bg-[#16191e] rounded-2xl p-4 flex items-start justify-between border border-[#2a2d33] shadow-lg">
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="font-bold text-[#e8eaed] truncate text-sm mb-1">{card.front}</div>
                        <div className="text-xs text-[#9b9e9e] truncate mb-2">{card.back}</div>
                        <div className="flex gap-3 text-[10px] font-mono text-[#9b9e9e]/70">
                          {card.isMastered && <span className="text-[#53fc18] font-bold">Mastered</span>}
                          <span>EF: {card.easeFactor.toFixed(1)}</span>
                          <span>Interval: {card.interval}d</span>
                          {card.nextReview && <span>Next: {new Date(card.nextReview).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => editCard(card)}
                          className="p-2 hover:bg-[#20242b] rounded-xl text-[#9b9e9e] hover:text-[#e8eaed] transition">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => deleteCard(card._id)}
                          className="p-2 hover:bg-red-500/15 rounded-xl text-[#9b9e9e] hover:text-red-400 transition">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <Link to="/dashboard" className="inline-flex items-center gap-2 mt-8 text-xs font-bold text-[#53fc18] hover:underline transition">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
