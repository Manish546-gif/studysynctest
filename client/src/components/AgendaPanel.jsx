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
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add agenda item..."
          className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-zoom-blue"
        />
        <button onClick={add} className="shrink-0 px-2.5 py-1.5 bg-zoom-blue text-white rounded text-[11px] font-medium hover:bg-[#0b5fc7]">
          <Plus size={12} />
        </button>
      </div>

      {agenda.length === 0 ? (
        <div className="text-[11px] text-white/30 text-center py-6">No agenda items yet</div>
      ) : (
        <div className="space-y-1.5">
          {agenda.map((item, i) => {
            const done = item.done
            return (
              <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5">
                <button onClick={() => emitToggleAgenda(i)} className="shrink-0 text-white/40 hover:text-zoom-blue">
                  {done ? <CheckCircle2 size={14} className="text-green-400" /> : <Circle size={14} />}
                </button>
                <span className={`flex-1 min-w-0 text-[11px] ${done ? 'line-through text-white/30' : 'text-white/80'}`}>
                  {item.text}
                </span>
                <button onClick={() => emitDeleteAgenda(i)} className="shrink-0 text-white/25 hover:text-red-400">
                  <Trash2 size={12} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
