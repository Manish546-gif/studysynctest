import { useState } from 'react'
import { Plus, Trash2, CheckCircle2, Circle, ListChecks } from 'lucide-react'

export default function AgendaPanel({ agenda, emitAddAgenda, emitToggleAgenda, emitDeleteAgenda }) {
  const [text, setText] = useState('')

  const add = () => {
    if (!text.trim()) return
    emitAddAgenda(text.trim())
    setText('')
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add agenda item..."
          className="flex-1 min-w-0 bg-[#0e0f13] border border-[#2a2d33] rounded-xl px-3 py-2 text-xs text-[#e8eaed] placeholder:text-[#9b9e9e]/50 focus:outline-none focus:border-[#53fc18]"
        />
        <button onClick={add} className="shrink-0 px-3 py-2 bg-[#53fc18] text-black rounded-xl text-xs font-bold hover:bg-[#48de13] transition">
          <Plus size={14} />
        </button>
      </div>

      {agenda.length === 0 ? (
        <div className="text-xs text-[#9b9e9e]/60 text-center py-6">No agenda items added yet</div>
      ) : (
        <div className="space-y-2">
          {agenda.map((item, i) => {
            const done = item.done
            return (
              <div key={i} className="flex items-center gap-2.5 bg-[#0e0f13] border border-[#2a2d33] rounded-xl px-3 py-2">
                <button onClick={() => emitToggleAgenda(i)} className="shrink-0 text-[#9b9e9e] hover:text-[#53fc18] transition">
                  {done ? <CheckCircle2 size={16} className="text-[#53fc18]" /> : <Circle size={16} />}
                </button>
                <span className={`flex-1 min-w-0 text-xs font-medium ${done ? 'line-through text-[#9b9e9e]/50' : 'text-[#e8eaed]'}`}>
                  {item.text}
                </span>
                <button onClick={() => emitDeleteAgenda(i)} className="shrink-0 text-[#9b9e9e]/40 hover:text-red-400 transition">
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
