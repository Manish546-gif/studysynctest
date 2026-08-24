import { useState } from 'react'

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
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-white mb-3">Breakout Rooms</h3>

      {isHost && (
        <div className="flex gap-2 mb-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Room name..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500"
            onKeyDown={(e) => e.key === 'Enter' && createRoom()}
          />
          <button onClick={createRoom}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium text-white transition">
            + Add
          </button>
        </div>
      )}

      {breakoutRooms?.length > 0 ? (
        <div className="space-y-2">
          {breakoutRooms.map((br, i) => (
            <div key={i} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">{br.name}</div>
                <div className="text-xs text-white/50">{br.members?.length || 0} members</div>
              </div>
              <div className="flex gap-1">
                {myBreakout === i ? (
                  <button onClick={leaveRoom}
                    className="px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-xs transition">
                    Leave
                  </button>
                ) : (
                  <button onClick={() => joinRoom(i)}
                    className="px-2 py-1 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 rounded text-xs transition">
                    Join
                  </button>
                )}
                {isHost && (
                  <button onClick={() => deleteRoom(i)}
                    className="px-2 py-1 bg-white/5 hover:bg-white/10 text-white/40 rounded text-xs transition">
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-white/40 text-center py-4">
          {isHost ? 'Create breakout rooms to split the group' : 'No breakout rooms yet'}
        </div>
      )}
    </div>
  )
}
