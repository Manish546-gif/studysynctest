import { useState, useRef, useEffect } from 'react'
import { Smile, Hand, ThumbsUp, Heart, Star, Zap, Flame, Eye, MessageSquare, Award, CheckCircle } from 'lucide-react'

// Icon-based reactions (no emojis) — each has a unique icon + label + color
const ICON_REACTIONS = [
  { id: 'thumb', Icon: ThumbsUp,     label: '+1',     color: '#53fc18', emoji: '👍' },
  { id: 'heart', Icon: Heart,        label: 'Love',   color: '#ff6b6b', emoji: '❤️' },
  { id: 'star',  Icon: Star,         label: 'Star',   color: '#fbbf24', emoji: '⭐' },
  { id: 'zap',   Icon: Zap,          label: 'Hype',   color: '#a78bfa', emoji: '⚡' },
  { id: 'fire',  Icon: Flame,        label: 'Fire',   color: '#f97316', emoji: '🔥' },
  { id: 'eye',   Icon: Eye,          label: 'Wow',    color: '#38bdf8', emoji: '👀' },
  { id: 'check', Icon: CheckCircle,  label: 'Got it', color: '#34d399', emoji: '✅' },
  { id: 'award', Icon: Award,        label: 'GG',     color: '#f59e0b', emoji: '🏆' },
]

export default function ReactionPicker({ onReaction, onToggleHand }) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(null)
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
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
          open
            ? 'bg-[#53fc18] text-black scale-110'
            : 'bg-[#16191e] border border-[#2a2d33] text-[#e8eaed] hover:bg-[#20242b] hover:scale-105'
        }`}
        title="Reactions"
      >
        <Smile size={16} className={`transition-transform duration-200 ${open ? 'rotate-12' : 'rotate-0'}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#16191e] border border-[#2a2d33] rounded-2xl p-2.5 flex items-center gap-1 shadow-2xl z-50">
          {ICON_REACTIONS.map(({ id, Icon, label, color, emoji }) => (
            <button
              key={id}
              onClick={() => { onReaction(emoji); setOpen(false) }}
              onMouseEnter={() => setHovered(id)}
              onMouseLeave={() => setHovered(null)}
              className="relative flex flex-col items-center justify-center w-9 h-9 rounded-xl transition-all duration-150 hover:bg-[#20242b] group"
              title={label}
              style={{
                transform: hovered === id ? 'scale(1.3) translateY(-4px)' : 'scale(1)',
                transition: 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1)',
              }}
            >
              <Icon
                size={16}
                style={{
                  color: hovered === id ? color : '#9b9e9e',
                  transition: 'color 0.15s ease, fill 0.15s ease',
                  fill: hovered === id && (id === 'heart' || id === 'star' || id === 'fire' || id === 'thumb') ? color : 'none',
                  strokeWidth: hovered === id ? 2.5 : 2,
                }}
              />
              {/* Tooltip */}
              {hovered === id && (
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#0e0f13] border border-[#2a2d33] text-[10px] font-bold text-white px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none shadow-lg">
                  {label}
                </span>
              )}
            </button>
          ))}

          <div className="w-px h-5 bg-[#2a2d33] mx-0.5" />

          {/* Raise Hand icon button */}
          <button
            onClick={() => { onToggleHand(); setOpen(false) }}
            onMouseEnter={() => setHovered('hand')}
            onMouseLeave={() => setHovered(null)}
            className="flex items-center justify-center w-9 h-9 rounded-xl transition-all hover:bg-[#20242b]"
            title="Raise Hand"
            style={{
              transform: hovered === 'hand' ? 'scale(1.3) translateY(-4px)' : 'scale(1)',
              transition: 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            <Hand
              size={16}
              style={{
                color: hovered === 'hand' ? '#fbbf24' : '#9b9e9e',
                transition: 'color 0.15s ease',
                strokeWidth: hovered === 'hand' ? 2.5 : 2,
              }}
            />
            {hovered === 'hand' && (
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#0e0f13] border border-[#2a2d33] text-[10px] font-bold text-white px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none shadow-lg">
                Raise Hand
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
