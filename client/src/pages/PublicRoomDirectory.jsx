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
    <div className="min-h-screen bg-[#0e0f13] text-[#e8eaed] p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-[#e8eaed]">Public Study Rooms</h1>
        <p className="text-sm text-[#9b9e9e] mb-6">Explore and join open community study spaces across all topics.</p>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search public rooms..."
            className="flex-1 bg-[#16191e] border border-[#2a2d33] rounded-xl px-4 py-2.5 text-xs text-[#e8eaed] placeholder:text-[#9b9e9e]/50 focus:outline-none focus:border-[#53fc18] transition-colors"
          />
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="bg-[#16191e] border border-[#2a2d33] rounded-xl px-4 py-2.5 text-xs text-[#e8eaed] focus:outline-none focus:border-[#53fc18] cursor-pointer"
          >
            <option value="" className="bg-[#16191e]">All Subjects</option>
            {subjects.map((s) => <option key={s} value={s} className="bg-[#16191e]">{s}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="text-[#9b9e9e] text-center py-16 text-sm font-semibold">Loading public rooms...</div>
        ) : rooms.length === 0 ? (
          <div className="bg-[#16191e] border border-[#2a2d33] rounded-2xl text-[#9b9e9e] text-center py-16 text-sm font-semibold shadow-xl">
            No public rooms found matching your search
          </div>
        ) : (
          <div className="grid gap-3">
            {rooms.map((room) => (
              <motion.div key={room._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-[#16191e] border border-[#2a2d33] rounded-2xl p-5 flex items-center justify-between shadow-lg hover:border-[#53fc18]/50 transition-colors">
                <div>
                  <div className="font-bold text-base text-[#e8eaed] mb-1">{room.name}</div>
                  <div className="text-xs text-[#9b9e9e]">
                    Hosted by <span className="text-[#e8eaed] font-semibold">{room.host?.name || 'Unknown'}</span> • {room.members?.length || 0} active members • {room.tag || 'Study'}
                    {room.subject && ` • ${room.subject}`}
                  </div>
                </div>
                <button
                  onClick={() => joinRoom(room.code)}
                  className="px-5 py-2 bg-[#53fc18] hover:bg-[#48de13] text-black rounded-xl text-xs font-bold transition shadow-md shrink-0"
                >
                  Join Room
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: pages }, (_, i) => (
              <button key={i} onClick={() => fetchRooms(i + 1)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${page === i + 1 ? 'bg-[#53fc18] text-black shadow-md' : 'bg-[#16191e] text-[#9b9e9e] border border-[#2a2d33] hover:bg-[#20242b]'}`}>
                {i + 1}
              </button>
            ))}
          </div>
        )}

        <Link to="/dashboard" className="inline-block mt-8 text-xs font-bold text-[#53fc18] hover:underline transition">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
