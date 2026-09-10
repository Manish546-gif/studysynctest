import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { Plus, Check, ListMusic, X, FolderPlus, Loader2, Music } from 'lucide-react'
import { api } from '../services/api'

export default function SaveToPlaylistModal({ isOpen, onClose, track, onPlaylistUpdated }) {
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(false)
  const [addingId, setAddingId] = useState(null)
  const [successId, setSuccessId] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      setError(null)
      setSuccessId(null)
      setShowCreate(false)
      setNewPlaylistName('')
      api
        .getPlaylists()
        .then((res) => setPlaylists(res.playlists || []))
        .catch((err) => {
          console.warn('Fetch playlists error:', err)
          setError('Could not load playlists. Make sure you are logged in.')
        })
        .finally(() => setLoading(false))
    }
  }, [isOpen])

  if (!isOpen || !track) return null

  const handleAddToPlaylist = async (playlistId) => {
    if (addingId || successId === playlistId) return
    try {
      setAddingId(playlistId)
      const res = await api.addTrackToPlaylist(playlistId, {
        title: track.title,
        artist: track.artist,
        thumbnail: track.thumbnail || track.artwork || '',
        durationText: track.durationText || '',
        videoId: track.videoId || '',
        audioUrl: track.audioUrl || '',
        source: track.source || 'youtube',
        trackId: track.id || track.videoId || track.audioUrl || `${Date.now()}`,
      })
      setSuccessId(playlistId)
      if (res.playlist && onPlaylistUpdated) onPlaylistUpdated(res.playlist)
      setTimeout(() => onClose(), 900)
    } catch (err) {
      alert(err.message || 'Failed to add track to playlist')
    } finally {
      setAddingId(null)
    }
  }

  const handleCreatePlaylist = async (e) => {
    e.preventDefault()
    if (!newPlaylistName.trim()) return
    try {
      setCreating(true)
      const res = await api.createPlaylist({
        name: newPlaylistName.trim(),
        color: '#53fc18',
        icon: 'headphones',
      })
      if (res.playlist) {
        setPlaylists((prev) => [res.playlist, ...prev])
        if (onPlaylistUpdated) onPlaylistUpdated(res.playlist)
        await handleAddToPlaylist(res.playlist._id)
      }
    } catch (err) {
      alert(err.message || 'Failed to create playlist')
    } finally {
      setCreating(false)
      setNewPlaylistName('')
      setShowCreate(false)
    }
  }

  const modal = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 99999,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      />

      {/* Card */}
      <div
        className="relative bg-[#101318] border border-[#2a2d33] rounded-2xl shadow-2xl"
        style={{ zIndex: 100000, width: '380px', maxWidth: 'calc(100vw - 32px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ListMusic size={16} className="text-[#53fc18]" />
            <span className="text-sm font-bold text-white">Save to Playlist</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Track preview */}
        <div className="px-4 py-3 bg-white/5 border-b border-white/5 flex items-center gap-3">
          {(track.thumbnail || track.artwork) ? (
            <img
              src={track.thumbnail || track.artwork}
              alt=""
              className="w-10 h-10 rounded-lg object-cover shrink-0 bg-white/10"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg shrink-0 bg-[#53fc18]/20 flex items-center justify-center">
              <Music size={16} className="text-[#53fc18]" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{track.title || 'Unknown Track'}</p>
            <p className="text-[11px] text-white/50 truncate">{track.artist || ''}</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-3 space-y-2" style={{ maxHeight: '280px', overflowY: 'auto' }}>
          {/* Create new playlist inline form */}
          {showCreate ? (
            <form onSubmit={handleCreatePlaylist} className="space-y-2 p-3 bg-white/5 rounded-xl border border-white/10">
              <p className="text-[11px] text-white/60 font-semibold">New Playlist Name</p>
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="e.g. Late Night Coding"
                autoFocus
                className="w-full px-3 py-2 rounded-lg bg-[#181b22] border border-white/15 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#53fc18] transition-colors"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setNewPlaylistName('') }}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newPlaylistName.trim()}
                  className="px-4 py-1.5 rounded-lg text-[11px] font-bold bg-[#53fc18] text-[#0c0e12] flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all"
                >
                  {creating ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                  Create & Add
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#53fc18]/10 hover:bg-[#53fc18]/20 border border-[#53fc18]/30 hover:border-[#53fc18]/50 text-[#53fc18] text-xs font-bold transition-all"
            >
              <FolderPlus size={15} />
              + Create New Playlist
            </button>
          )}

          {/* Divider */}
          {!showCreate && playlists.length > 0 && (
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold px-1 pt-1">
              Add to existing playlist
            </p>
          )}

          {/* Error */}
          {error && (
            <p className="text-center text-xs text-red-400 py-3">{error}</p>
          )}

          {/* Playlists */}
          {loading ? (
            <div className="py-8 flex justify-center">
              <Loader2 size={22} className="animate-spin text-[#53fc18]" />
            </div>
          ) : playlists.length === 0 && !showCreate ? (
            <p className="text-center text-xs text-white/40 py-4">
              No playlists yet. Create one above!
            </p>
          ) : (
            playlists.map((pl) => {
              const isAdded = successId === pl._id
              const isAdding = addingId === pl._id
              return (
                <button
                  key={pl._id}
                  onClick={() => handleAddToPlaylist(pl._id)}
                  disabled={isAdding}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all ${
                    isAdded
                      ? 'bg-[#53fc18]/20 border-[#53fc18]/60 text-white'
                      : 'bg-[#181b22] border-white/8 hover:border-white/20 hover:bg-white/5 text-white/90'
                  } disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${pl.color || '#53fc18'}25`, color: pl.color || '#53fc18' }}
                    >
                      <ListMusic size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{pl.name}</p>
                      <p className="text-[10px] text-white/40">
                        {pl.tracks?.length || 0} tracks
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 ml-2">
                    {isAdding ? (
                      <Loader2 size={14} className="animate-spin text-[#53fc18]" />
                    ) : isAdded ? (
                      <div className="flex items-center gap-1 text-[#53fc18]">
                        <Check size={14} />
                        <span className="text-[10px] font-bold">Added!</span>
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#53fc18] hover:text-black transition-colors">
                        <Plus size={12} />
                      </div>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )

  // Render via portal to escape any parent overflow-hidden / z-index constraints
  return ReactDOM.createPortal(modal, document.body)
}
