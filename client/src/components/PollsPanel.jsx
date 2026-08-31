import { useState } from 'react'
import { Plus, BarChart3, CheckCircle2, Trophy, X, ListChecks } from 'lucide-react'

export default function PollsPanel({ polls, user, isHost, emitCreatePoll, emitPollVote, emitPollClose }) {
  const [creating, setCreating] = useState(false)
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [isQuiz, setIsQuiz] = useState(false)
  const [correctIndex, setCorrectIndex] = useState(0)

  const userId = user?.id || user?._id

  const addOption = () => {
    if (options.length < 6) setOptions([...options, ''])
  }

  const submitPoll = () => {
    const opts = options.filter((o) => o.trim())
    if (!question.trim() || opts.length < 2) return
    emitCreatePoll({
      question: question.trim(),
      options: opts,
      isQuiz,
      correctIndex: isQuiz ? correctIndex : -1,
    })
    setCreating(false)
    setQuestion('')
    setOptions(['', ''])
    setIsQuiz(false)
    setCorrectIndex(0)
  }

  const hasVoted = (poll, uid) => {
    return poll.options?.some((o) => o.votes?.some((v) => String(v) === String(uid)))
  }

  const totalVotes = (poll) => poll.options?.reduce((sum, o) => sum + (o.votes?.length || 0), 0) || 0

  return (
    <div className="space-y-2">
      {!creating ? (
        <button
          onClick={() => setCreating(true)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-zoom-blue text-white rounded-lg text-xs font-semibold hover:bg-[#0b5fc7] transition"
        >
          <Plus size={13} /> Create Poll
        </button>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-lg p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-white/60">New {isQuiz ? 'Quiz' : 'Poll'}</p>
            <button onClick={() => setCreating(false)} className="text-white/40 hover:text-white"><X size={13} /></button>
          </div>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Question"
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-zoom-blue"
          />
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-1.5">
              {isQuiz && (
                <button
                  onClick={() => setCorrectIndex(i)}
                  title="Mark as correct"
                  className={`shrink-0 w-4 h-4 rounded-full border flex items-center justify-center ${correctIndex === i ? 'bg-green-500 border-green-500' : 'border-white/30'}`}
                >
                  {correctIndex === i && <CheckCircle2 size={11} className="text-white" />}
                </button>
              )}
              <input
                value={opt}
                onChange={(e) => setOptions(options.map((o, j) => (j === i ? e.target.value : o)))}
                placeholder={`Option ${i + 1}`}
                className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-zoom-blue"
              />
              {options.length > 2 && (
                <button onClick={() => setOptions(options.filter((_, j) => j !== i))} className="text-white/30 hover:text-red-400"><X size={12} /></button>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {options.length < 6 && (
                <button onClick={addOption} className="text-[11px] text-zoom-blue hover:underline">+ Add option</button>
              )}
              <button
                onClick={() => setIsQuiz(!isQuiz)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition ${isQuiz ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'}`}
              >
                <Trophy size={10} /> Quiz
              </button>
            </div>
            <button
              onClick={submitPoll}
              disabled={!question.trim() || options.filter((o) => o.trim()).length < 2}
              className="px-3 py-1 rounded bg-zoom-blue text-white text-[11px] font-medium hover:bg-[#0b5fc7] disabled:opacity-40"
            >
              Launch
            </button>
          </div>
        </div>
      )}

      {polls.length === 0 ? (
        <div className="text-[11px] text-white/30 text-center py-6">No polls yet</div>
      ) : (
        polls.map((poll, pollIndex) => {
          const voted = hasVoted(poll, userId)
          const votes = totalVotes(poll)
          return (
            <div key={poll._id} className="bg-white/5 border border-white/10 rounded-lg p-2.5">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="text-xs font-medium text-white/80 flex items-center gap-1.5">
                  {poll.isQuiz ? <Trophy size={12} className="text-amber-400" /> : <BarChart3 size={12} className="text-zoom-blue" />}
                  {poll.question}
                </p>
                {isHost && poll.active !== false && (
                  <button onClick={() => emitPollClose(pollIndex)} className="text-[10px] text-white/40 hover:text-red-400 shrink-0">Close</button>
                )}
              </div>
              {poll.active === false && <p className="text-[10px] text-white/30 mb-1.5">Poll closed</p>}
              <div className="space-y-1">
                {poll.options?.map((opt, optIndex) => {
                  const optVotes = opt.votes?.length || 0
                  const pct = votes > 0 ? Math.round((optVotes / votes) * 100) : 0
                  const isCorrectShown = poll.isQuiz && poll.active !== false && isHost && poll.correctIndex === optIndex
                  const myVote = opt.votes?.some((v) => String(v) === String(userId))
                  return (
                    <button
                      key={opt._id}
                      onClick={() => emitPollVote(pollIndex, optIndex)}
                      disabled={voted || poll.active === false}
                      className={`relative w-full text-left px-2 py-1.5 rounded text-[11px] overflow-hidden ${myVote ? 'bg-zoom-blue/30 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'} disabled:opacity-80`}
                    >
                      <span className="absolute inset-y-0 left-0 bg-zoom-blue/20 transition-all" style={{ width: `${pct}%` }} />
                      <span className="relative flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5">
                          {opt.text}
                          {isCorrectShown && <CheckCircle2 size={11} className="text-green-400" />}
                        </span>
                        {voted && <span className="text-[10px] text-white/50">{pct}% ({optVotes})</span>}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
