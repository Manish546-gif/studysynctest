import { useState } from 'react'
import { Plus, Trash2, Palette } from 'lucide-react'

const COLORS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#e9d5ff', '#fed7aa']

export default function StickyNotesPanel({ stickyNotes, emitStickyAdd, emitStickyUpdate, emitStickyDelete }) {
  const [text, setText] = useState('')
  const [color, setColor] = useState(COLORS[0])

  const add = () => {
    if (!text.trim()) return
    emitStickyAdd({ text: text.trim(), color })
    setText('')
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a note..."
          rows={2}
          className="w-full bg-[#0e0f13] border border-[#2a2d33] rounded-xl px-3 py-2 text-xs text-[#e8eaed] placeholder:text-[#9b9e9e]/50 focus:outline-none focus:border-[#53fc18] resize-none transition-colors"
        />
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-5 h-5 rounded-full border-2 transition ${color === c ? 'border-white scale-110 shadow-md' : 'border-transparent opacity-80 hover:opacity-100'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            onClick={add}
            disabled={!text.trim()}
            className="ml-auto px-3 py-1.5 bg-[#53fc18] text-black rounded-xl text-xs font-bold hover:bg-[#48de13] disabled:opacity-40 flex items-center gap-1.5 transition-all"
          >
            <Plus size={13} /> Add
          </button>
        </div>
      </div>

      {stickyNotes.length === 0 ? (
        <div className="text-[11px] text-white/30 text-center py-6">No notes yet</div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {stickyNotes.map((note, i) => (
            <div
              key={i}
              className="rounded-lg p-2 relative group"
              style={{ backgroundColor: note.color || COLORS[0] }}
            >
              <p className="text-[11px] text-black/80 leading-relaxed break-words min-h-[2rem]">
                {note.text}
              </p>
              <button
                onClick={() => emitStickyDelete(i)}
                className="absolute top-1 right-1 w-4 h-4 rounded bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-black/20 transition"
              >
                <Trash2 size={9} className="text-black/50" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
