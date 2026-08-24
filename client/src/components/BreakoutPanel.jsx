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
            className="flex-1 bg-surface border border-outline-variant/30 rounded-lg px-3 py-1.5 text-sm text-on-surface placeholder:text-on-surface/40 focus:outline-none focus:border-primary"
            onKeyDown={(e) => e.key === 'Enter' && createRoom()}
          />
          <button onClick={createRoom}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary/90 transition">
            <Plus size={14} /> Add
          </button>
        </div>
      )}

      {breakoutRooms?.length > 0 ? (
        <div className="space-y-2">
          {breakoutRooms.map((br, i) => (
            <div key={i} className="bg-surface border border-outline-variant/20 rounded-xl p-3 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium text-on-surface truncate">{br.name}</div>
                <div className="text-xs text-on-surface/50">{br.members?.length || 0} member{br.members?.length !== 1 ? 's' : ''}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                {myBreakout === i ? (
                  <button onClick={leaveRoom}
                    className="flex items-center gap-1 px-2 py-1 bg-error/10 hover:bg-error/20 text-error rounded-lg text-xs font-medium transition">
                    <LogOut size={12} /> Leave
                  </button>
                ) : (
                  <button onClick={() => joinRoom(i)}
                    className="flex items-center gap-1 px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-medium transition">
                    <LogIn size={12} /> Join
                  </button>
                )}
                {isHost && (
                  <button onClick={() => deleteRoom(i)}
                    className="p-1.5 hover:bg-error/10 text-on-surface/30 hover:text-error rounded-lg transition">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-on-surface/40 text-center py-6">
          {isHost ? 'Create breakout rooms to split the group' : 'No breakout rooms yet'}
        </div>
      )}
    </div>
  )
}
