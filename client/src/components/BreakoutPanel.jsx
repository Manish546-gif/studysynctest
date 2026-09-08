import { useState } from 'react'
import { Plus, LogIn, LogOut, Trash2 } from 'lucide-react'

export default function BreakoutPanel({ breakoutRooms, socketRef, userId, isHost }) {
  const [newName, setNewName] = useState('')

  const createRoom = () => {
    if (!socketRef.current) return
    socketRef.current.emit('breakout-create', { name: newName || undefined })
    setNewName('')
  }

  const joinRoom = (index) => {
    if (!socketRef.current) return
    socketRef.current.emit('breakout-join', { breakoutIndex: index })
  }

  const leaveRoom = () => {
    if (!socketRef.current) return
    socketRef.current.emit('breakout-leave')
  }

  const deleteRoom = (index) => {
    if (!socketRef.current) return
    socketRef.current.emit('breakout-delete', { breakoutIndex: index })
  }

  const myBreakout = breakoutRooms?.findIndex((br) =>
    br.members?.some((m) => m === userId || m?._id === userId)
  )

  return (
    <div className="space-y-3">
      {isHost && (
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Room name..."
            className="flex-1 min-w-0 bg-[#0e0f13] border border-[#2a2d33] rounded-xl px-3 py-2 text-xs text-[#e8eaed] placeholder:text-[#9b9e9e]/50 focus:outline-none focus:border-[#53fc18]"
            onKeyDown={(e) => e.key === 'Enter' && createRoom()}
          />
          <button onClick={createRoom}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#53fc18] text-black rounded-xl text-xs font-bold hover:bg-[#48de13] transition shrink-0">
            <Plus size={14} /> Add
          </button>
        </div>
      )}

      {breakoutRooms?.length > 0 ? (
        <div className="space-y-2">
          {breakoutRooms.map((br, i) => (
            <div key={i} className="bg-[#0e0f13] border border-[#2a2d33] rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#e8eaed] truncate">{br.name}</div>
                <div className="text-[10px] text-[#9b9e9e]">{br.members?.length || 0} member{br.members?.length !== 1 ? 's' : ''}</div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                {myBreakout === i ? (
                  <button onClick={leaveRoom}
                    className="flex items-center gap-1 px-2.5 py-1 bg-red-500/15 hover:bg-red-500/25 text-red-400 rounded-lg text-xs font-bold transition">
                    <LogOut size={12} /> Leave
                  </button>
                ) : (
                  <button onClick={() => joinRoom(i)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-[#53fc18]/15 hover:bg-[#53fc18]/25 text-[#53fc18] border border-[#53fc18]/30 rounded-lg text-xs font-bold transition">
                    <LogIn size={12} /> Join
                  </button>
                )}
                {isHost && (
                  <button onClick={() => deleteRoom(i)}
                    className="p-1.5 hover:bg-red-500/15 text-[#9b9e9e] hover:text-red-400 rounded-lg transition">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-[#9b9e9e]/60 text-center py-6">
          {isHost ? 'Create breakout rooms to split the group' : 'No breakout rooms yet'}
        </div>
      )}
    </div>
  )
}
