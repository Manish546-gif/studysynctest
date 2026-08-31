import { UserPlus, Check, X, Users } from 'lucide-react'

export default function WaitingRoomPanel({ waitingRoom, roomUsers, isHost, emitWaitingAdmit, emitWaitingDeny }) {
  if (!isHost) {
    return (
      <div className="text-[11px] text-white/30 text-center py-6">
        Only the host can manage the waiting room
      </div>
    )
  }

  if (waitingRoom.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[11px] text-white/50">
          <Users size={13} className="text-white/30" />
          <span>Waiting room is empty</span>
        </div>
        <p className="text-[10px] text-white/25">Participants will appear here when they join the room before being admitted.</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {waitingRoom.map((entry) => {
        // entry can be a populated object {_id, name, avatar} or a plain userId string
        const userId = typeof entry === 'object' ? (entry._id || entry.userId) : entry
        const member = typeof entry === 'object' && entry.name
          ? entry
          : roomUsers.find((u) => String(u._id || u.userId) === String(userId)) || {}
        const name = member?.name || 'Unknown'
        const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
        return (
          <div key={String(userId)} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2.5 py-2">
            <div className="w-7 h-7 rounded-full bg-zoom-blue/20 flex items-center justify-center text-[10px] font-bold text-zoom-blue shrink-0">
              {initials}
            </div>
            <span className="flex-1 min-w-0 text-[11px] text-white/80 truncate">{name}</span>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => emitWaitingAdmit(userId)}
                className="p-1 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition"
                title="Admit"
              >
                <Check size={12} />
              </button>
              <button
                onClick={() => emitWaitingDeny(userId)}
                className="p-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                title="Deny"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
