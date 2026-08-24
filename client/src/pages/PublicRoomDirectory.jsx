import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

export default function PublicRoomDirectory() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState('')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const navigate = useNavigate()

  const fetchRooms = async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p }
      if (search) params.search = search
      if (subject) params.subject = subject
      const r = await api.get('/stats/public-rooms', { params })
      setRooms(r.data.rooms)
      setPages(r.data.pages)
      setPage(r.data.page)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchRooms(1) }, [search, subject])

  const joinRoom = async (code) => {
    try {
      const r = await api.post(`/rooms/join/${code}`)
      if (r.data.room) navigate(`/workspace/${r.data.room._id}`)
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to join')
    }
  }

  const subjects = ['Study', 'Math', 'Science', 'CS', 'Language', 'Writing', 'Other']

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Public Rooms</h1>

        <div className="flex gap-4 mb-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rooms..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500"
          />
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
          >
            <option value="">All Subjects</option>
            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="text-white/60 text-center py-12">Loading...</div>
        ) : rooms.length === 0 ? (
          <div className="text-white/60 text-center py-12">No public rooms found</div>
        ) : (
          <div className="grid gap-4">
            {rooms.map((room) => (
              <motion.div key={room._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-lg">{room.name}</div>
                  <div className="text-sm text-white/60">
                    Hosted by {room.host?.name || 'Unknown'} • {room.members?.length || 0} members • {room.tag || 'Study'}
                    {room.subject && ` • ${room.subject}`}
                  </div>
                </div>
                <button
                  onClick={() => joinRoom(room.code)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition"
                >
                  Join
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: pages }, (_, i) => (
              <button key={i} onClick={() => fetchRooms(i + 1)}
                className={`px-3 py-1 rounded-lg text-sm ${page === i + 1 ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                {i + 1}
              </button>
            ))}
          </div>
        )}

        <Link to="/dashboard" className="inline-block mt-6 text-purple-400 hover:text-purple-300 transition">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
