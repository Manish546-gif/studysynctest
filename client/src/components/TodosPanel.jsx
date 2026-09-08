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
    return u?.username ? `@${u.username}` : (u?.name || null)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add a task..."
          className="flex-1 min-w-0 bg-[#0e0f13] border border-[#2a2d33] rounded-xl px-3 py-2 text-xs text-[#e8eaed] placeholder:text-[#9b9e9e]/50 focus:outline-none focus:border-[#53fc18]"
        />
        <select
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          className="max-w-[32%] bg-[#0e0f13] border border-[#2a2d33] rounded-xl px-2 py-2 text-xs text-[#9b9e9e] outline-none cursor-pointer focus:border-[#53fc18]"
        >
          <option value="" className="bg-[#16191e] text-[#e8eaed]">No one</option>
          {roomUsers.map((u) => (
            <option key={u._id || u.userId} value={u._id || u.userId} className="bg-[#16191e] text-[#e8eaed]">{u.name}</option>
          ))}
        </select>
        <button onClick={add} className="shrink-0 px-3 py-2 bg-[#53fc18] text-black rounded-xl text-xs font-bold hover:bg-[#48de13] transition">
          <Plus size={14} />
        </button>
      </div>

      {todos.length === 0 ? (
        <div className="text-xs text-[#9b9e9e]/60 text-center py-6">No tasks added yet</div>
      ) : (
        <div className="space-y-2">
          {todos.map((todo, i) => {
            const assigneeName = userName(todo.assignee)
            const done = todo.done
            return (
              <div key={i} className="flex items-center gap-2.5 bg-[#0e0f13] border border-[#2a2d33] rounded-xl px-3 py-2">
                <button onClick={() => emitToggleTodo(i)} className="shrink-0 text-[#9b9e9e] hover:text-[#53fc18] transition">
                  {done ? <CheckCircle2 size={16} className="text-[#53fc18]" /> : <Circle size={16} />}
                </button>
                <span className={`flex-1 min-w-0 text-xs font-medium ${done ? 'line-through text-[#9b9e9e]/50' : 'text-[#e8eaed]'}`}>
                  {todo.text}
                </span>
                {assigneeName && (
                  <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-[#53fc18]/15 border border-[#53fc18]/30 text-[#53fc18]">
                    {assigneeName}
                  </span>
                )}
                <button onClick={() => emitDeleteTodo(i)} className="shrink-0 text-[#9b9e9e]/40 hover:text-red-400 transition">
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
