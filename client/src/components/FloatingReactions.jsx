import { ThumbsUp, Heart, Star, Zap, Flame, Eye, CheckCircle, Award } from 'lucide-react'

// Map emoji to icon component for clean display
const REACTION_ICON_MAP = {
  '👍': { Icon: ThumbsUp,    color: '#53fc18' },
  '❤️': { Icon: Heart,       color: '#ff6b6b' },
  '⭐': { Icon: Star,        color: '#fbbf24' },
  '⚡': { Icon: Zap,         color: '#a78bfa' },
  '🔥': { Icon: Flame,       color: '#f97316' },
  '👀': { Icon: Eye,         color: '#38bdf8' },
  '✅': { Icon: CheckCircle, color: '#34d399' },
  '🏆': { Icon: Award,       color: '#f59e0b' },
  // Legacy fallbacks
  '😂': { Icon: Star,        color: '#fbbf24' },
  '🎉': { Icon: Award,       color: '#f59e0b' },
  '🤔': { Icon: Eye,         color: '#38bdf8' },
  '✨': { Icon: Zap,         color: '#a78bfa' },
  '👏': { Icon: ThumbsUp,    color: '#53fc18' },
  '💯': { Icon: CheckCircle, color: '#34d399' },
}

export default function FloatingReactions({ reactions }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {reactions.map((r) => {
        const mapping = REACTION_ICON_MAP[r.emoji] || { Icon: Heart, color: '#53fc18' }
        const { Icon, color } = mapping
        return (
          <div
            key={r.id}
            className="absolute animate-float-up select-none"
            style={{
              left: `${r.x}%`,
              bottom: '10%',
              animationDuration: '2.5s',
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-2xl"
              style={{
                background: `${color}20`,
                border: `2px solid ${color}60`,
                boxShadow: `0 0 16px ${color}40`,
              }}
            >
              <Icon size={18} style={{ color }} strokeWidth={2.5} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
