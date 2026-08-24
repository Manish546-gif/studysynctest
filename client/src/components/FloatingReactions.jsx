export default function FloatingReactions({ reactions }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="absolute text-3xl animate-float-up select-none"
          style={{
            left: `${r.x}%`,
            bottom: '10%',
            animationDuration: '2.5s',
          }}
        >
          {r.emoji}
        </div>
      ))}
    </div>
  )
}
