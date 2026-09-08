import { UserPlus, Check, X, Users } from 'lucide-react'

export default function WaitingRoomPanel({ waitingRoom, roomUsers, isHost, emitWaitingAdmit, emitWaitingDeny }) {
  if (!isHost) {
    return (
      <div className="text-xs text-[#9b9e9e]/60 text-center py-6">
        Only the host can manage the waiting room
      </div>
    )
  }

  if (waitingRoom.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-[#9b9e9e]">
          <Users size={14} className="text-[#9b9e9e]/60" />
          <span>Waiting room is empty</span>
        </div>
        <p className="text-[10px] text-[#9b9e9e]/50">Participants will appear here when they request to join.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {waitingRoom.map((entry) => {
        const userId = typeof entry === 'object' ? (entry._id || entry.userId) : entry
        const member = typeof entry === 'object' && entry.name
          ? entry
          : roomUsers.find((u) => String(u._id || u.userId) === String(userId)) || {}
        const name = member?.name || 'Unknown'
        const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
        return (
          <div key={String(userId)} className="flex items-center gap-2.5 bg-[#0e0f13] border border-[#2a2d33] rounded-xl px-3 py-2">
            <div className="w-7 h-7 rounded-xl bg-[#53fc18]/15 border border-[#53fc18]/30 flex items-center justify-center text-xs font-bold text-[#53fc18] shrink-0">
              {initials}
            </div>
            <span className="flex-1 min-w-0 text-xs font-semibold text-[#e8eaed] truncate">{name}</span>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => emitWaitingAdmit(userId)}
                className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition"
                title="Admit"
              >
                <Check size={13} />
              </button>
              <button
                onClick={() => emitWaitingDeny(userId)}
                className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                title="Deny"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
