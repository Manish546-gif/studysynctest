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
    <div className="space-y-3">
      {!creating ? (
        <button
          onClick={() => setCreating(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#53fc18] text-black rounded-xl text-xs font-bold hover:bg-[#48de13] transition shadow-[0_0_12px_rgba(83,252,24,0.2)]"
        >
          <Plus size={14} /> Create Poll
        </button>
      ) : (
        <div className="bg-[#0e0f13] border border-[#2a2d33] rounded-xl p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#9b9e9e]">New {isQuiz ? 'Quiz' : 'Poll'}</p>
            <button onClick={() => setCreating(false)} className="text-[#9b9e9e] hover:text-[#e8eaed]"><X size={14} /></button>
          </div>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Question"
            className="w-full bg-[#16191e] border border-[#2a2d33] rounded-xl px-3 py-2 text-xs text-[#e8eaed] placeholder:text-[#9b9e9e]/50 focus:outline-none focus:border-[#53fc18]"
          />
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              {isQuiz && (
                <button
                  onClick={() => setCorrectIndex(i)}
                  title="Mark as correct"
                  className={`shrink-0 w-4 h-4 rounded-full border flex items-center justify-center ${correctIndex === i ? 'bg-[#53fc18] border-[#53fc18] text-black' : 'border-[#2a2d33]'}`}
                >
                  {correctIndex === i && <CheckCircle2 size={12} className="text-black" />}
                </button>
              )}
              <input
                value={opt}
                onChange={(e) => setOptions(options.map((o, j) => (j === i ? e.target.value : o)))}
                placeholder={`Option ${i + 1}`}
                className="flex-1 min-w-0 bg-[#16191e] border border-[#2a2d33] rounded-xl px-3 py-2 text-xs text-[#e8eaed] placeholder:text-[#9b9e9e]/50 focus:outline-none focus:border-[#53fc18]"
              />
              {options.length > 2 && (
                <button onClick={() => setOptions(options.filter((_, j) => j !== i))} className="text-[#9b9e9e] hover:text-red-400"><X size={14} /></button>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              {options.length < 6 && (
                <button onClick={addOption} className="text-xs text-[#53fc18] hover:underline font-semibold">+ Add option</button>
              )}
              <button
                onClick={() => setIsQuiz(!isQuiz)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${isQuiz ? 'bg-[#53fc18]/20 text-[#53fc18] border border-[#53fc18]/30' : 'bg-[#16191e] text-[#9b9e9e]'}`}
              >
                <Trophy size={12} /> Quiz
              </button>
            </div>
            <button
              onClick={submitPoll}
              disabled={!question.trim() || options.filter((o) => o.trim()).length < 2}
              className="px-4 py-1.5 rounded-xl bg-[#53fc18] text-black text-xs font-bold hover:bg-[#48de13] disabled:opacity-40 transition"
            >
              Launch
            </button>
          </div>
        </div>
      )}

      {polls.length === 0 ? (
        <div className="text-xs text-[#9b9e9e]/60 text-center py-6">No polls created yet</div>
      ) : (
        polls.map((poll, pollIndex) => {
          const voted = hasVoted(poll, userId)
          const votes = totalVotes(poll)
          return (
            <div key={poll._id} className="bg-[#0e0f13] border border-[#2a2d33] rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-xs font-bold text-[#e8eaed] flex items-center gap-2">
                  {poll.isQuiz ? <Trophy size={14} className="text-amber-400" /> : <BarChart3 size={14} className="text-[#53fc18]" />}
                  {poll.question}
                </p>
                {isHost && poll.active !== false && (
                  <button onClick={() => emitPollClose(pollIndex)} className="text-[11px] text-[#9b9e9e] hover:text-red-400 shrink-0 font-medium">Close</button>
                )}
              </div>
              {poll.active === false && <p className="text-[10px] text-[#9b9e9e]/50">Poll closed</p>}
              <div className="space-y-1.5">
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
                      className={`relative w-full text-left px-3 py-2 rounded-xl text-xs overflow-hidden transition-all ${myVote ? 'bg-[#53fc18]/20 border border-[#53fc18]/40 text-[#e8eaed]' : 'bg-[#16191e] border border-[#2a2d33] text-[#e8eaed] hover:bg-[#20242b]'} disabled:opacity-80`}
                    >
                      <span className="absolute inset-y-0 left-0 bg-[#53fc18]/15 transition-all" style={{ width: `${pct}%` }} />
                      <span className="relative flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 font-medium">
                          {opt.text}
                          {isCorrectShown && <CheckCircle2 size={12} className="text-[#53fc18]" />}
                        </span>
                        {voted && <span className="text-[10px] text-[#9b9e9e] font-mono font-bold">{pct}% ({optVotes})</span>}
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
