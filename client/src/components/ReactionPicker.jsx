import { useState, useRef, useEffect } from 'react'
import { Smile, Hand } from 'lucide-react'

const EMOJIS = ['👍', '❤️', '😂', '🎉', '🤔', '👀', '🔥', '✨', '👏', '💯']

export default function ReactionPicker({ onReaction, onToggleHand }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 ${
          open ? 'bg-zoom-blue text-white' : 'bg-white/10 text-white hover:bg-white/15'
        }`}
        title="Reactions"
      >
        <Smile size={16} />
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-zoom-dark border border-white/10 rounded-lg p-1.5 flex gap-0.5 shadow-2xl z-50">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => { onReaction(emoji); setOpen(false) }}
              className="text-lg hover:bg-white/10 rounded w-8 h-8 flex items-center justify-center transition hover:scale-110"
            >
              {emoji}
            </button>
          ))}
          <div className="border-l border-white/10 mx-0.5" />
          <button
            onClick={() => { onToggleHand(); setOpen(false) }}
            className="hover:bg-white/10 rounded w-8 h-8 flex items-center justify-center transition text-white/60 hover:text-white"
            title="Raise Hand"
          >
            <Hand size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
