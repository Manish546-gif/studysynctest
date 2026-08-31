import { useState } from 'react'
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react'

export default function TodosPanel({ todos, roomUsers, user, emitAddTodo, emitToggleTodo, emitDeleteTodo }) {
  const [text, setText] = useState('')
  const [assignee, setAssignee] = useState('')

  const add = () => {
    if (!text.trim()) return
    emitAddTodo(text.trim(), assignee || null)
    setText('')
    setAssignee('')
  }

  const userName = (id) => {
    const u = roomUsers?.find((r) => {
      const rid = r._id || r.userId
      return String(rid) === String(id)
    })
    return u?.name || null
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add a task..."
          className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-zoom-blue"
        />
        <select
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          className="max-w-[28%] bg-white/5 border border-white/10 rounded px-1.5 py-1.5 text-[11px] text-white/70 outline-none cursor-pointer"
        >
          <option value="">No one</option>
          {roomUsers.map((u) => (
            <option key={u._id || u.userId} value={u._id || u.userId}>{u.name}</option>
          ))}
        </select>
        <button onClick={add} className="shrink-0 px-2.5 py-1.5 bg-zoom-blue text-white rounded text-[11px] font-medium hover:bg-[#0b5fc7]">
          <Plus size={12} />
        </button>
      </div>

      {todos.length === 0 ? (
        <div className="text-[11px] text-white/30 text-center py-6">No tasks yet</div>
      ) : (
        <div className="space-y-1.5">
          {todos.map((todo, i) => {
            const assigneeName = userName(todo.assignee)
            const done = todo.done
            return (
              <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5">
                <button onClick={() => emitToggleTodo(i)} className="shrink-0 text-white/40 hover:text-zoom-blue">
                  {done ? <CheckCircle2 size={14} className="text-green-400" /> : <Circle size={14} />}
                </button>
                <span className={`flex-1 min-w-0 text-[11px] ${done ? 'line-through text-white/30' : 'text-white/80'}`}>
                  {todo.text}
                </span>
                {assigneeName && (
                  <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-zoom-blue/20 text-zoom-blue">
                    {assigneeName}
                  </span>
                )}
                <button onClick={() => emitDeleteTodo(i)} className="shrink-0 text-white/25 hover:text-red-400">
                  <Trash2 size={12} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
