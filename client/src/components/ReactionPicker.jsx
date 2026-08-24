import { useState, useRef, useEffect } from 'react'

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
        className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition text-xl"
        title="Reactions"
      >
        😊
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-800 border border-white/10 rounded-xl p-2 flex gap-1 shadow-2xl z-50">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => { onReaction(emoji); setOpen(false) }}
              className="text-2xl hover:bg-white/10 rounded-lg w-10 h-10 flex items-center justify-center transition hover:scale-125"
            >
              {emoji}
            </button>
          ))}
          <div className="border-l border-white/10 mx-1" />
          <button
            onClick={() => { onToggleHand(); setOpen(false) }}
            className="text-2xl hover:bg-white/10 rounded-lg w-10 h-10 flex items-center justify-center transition"
            title="Raise Hand"
          >
            ✋
          </button>
        </div>
      )}
    </div>
  )
}
