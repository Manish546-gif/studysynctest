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
    <div className="space-y-2">
      {isHost && (
        <div className="flex gap-1.5">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Room name..."
            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-zoom-blue"
            onKeyDown={(e) => e.key === 'Enter' && createRoom()}
          />
          <button onClick={createRoom}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-zoom-blue text-white rounded text-[11px] font-medium hover:bg-[#0b5fc7] transition shrink-0">
            <Plus size={12} /> Add
          </button>
        </div>
      )}

      {breakoutRooms?.length > 0 ? (
        <div className="space-y-1.5">
          {breakoutRooms.map((br, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-white/80 truncate">{br.name}</div>
                <div className="text-[10px] text-white/35">{br.members?.length || 0} member{br.members?.length !== 1 ? 's' : ''}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                {myBreakout === i ? (
                  <button onClick={leaveRoom}
                    className="flex items-center gap-0.5 px-1.5 py-1 bg-red-500/15 hover:bg-red-500/25 text-red-400 rounded text-[10px] font-medium transition">
                    <LogOut size={11} /> Leave
                  </button>
                ) : (
                  <button onClick={() => joinRoom(i)}
                    className="flex items-center gap-0.5 px-1.5 py-1 bg-zoom-blue/20 hover:bg-zoom-blue/30 text-zoom-blue rounded text-[10px] font-medium transition">
                    <LogIn size={11} /> Join
                  </button>
                )}
                {isHost && (
                  <button onClick={() => deleteRoom(i)}
                    className="p-1 hover:bg-red-500/15 text-white/30 hover:text-red-400 rounded transition">
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[11px] text-white/30 text-center py-6">
          {isHost ? 'Create breakout rooms to split the group' : 'No breakout rooms yet'}
        </div>
      )}
    </div>
  )
}
