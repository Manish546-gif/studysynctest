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
        className="w-12 h-12 rounded-2xl flex items-center justify-center bg-surface-container-high text-on-surface hover:bg-surface-container-high/80 transition-all duration-200"
        title="Reactions"
      >
        <Smile size={20} />
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-surface-container-high border border-outline-variant/20 rounded-xl p-2 flex gap-1 shadow-2xl z-50">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => { onReaction(emoji); setOpen(false) }}
              className="text-xl hover:bg-surface-container rounded-lg w-10 h-10 flex items-center justify-center transition hover:scale-110"
            >
              {emoji}
            </button>
          ))}
          <div className="border-l border-outline-variant/30 mx-1" />
          <button
            onClick={() => { onToggleHand(); setOpen(false) }}
            className="hover:bg-surface-container rounded-lg w-10 h-10 flex items-center justify-center transition text-on-surface/70 hover:text-on-surface"
            title="Raise Hand"
          >
            <Hand size={20} />
          </button>
        </div>
      )}
    </div>
  )
}
