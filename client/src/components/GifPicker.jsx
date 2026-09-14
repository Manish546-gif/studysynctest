import React, { useEffect, useRef } from 'react'
import { Loader2, Search, TrendingUp, X, Sparkles } from 'lucide-react'

const GIF_CATEGORIES = [
  { label: 'Trending', q: '' },
  { label: '😂 LOL', q: 'laugh' },
  { label: '👏 Clap', q: 'applause' },
  { label: '💃 Dance', q: 'dance' },
  { label: '😭 Sad', q: 'sad' },
  { label: '🎉 Party', q: 'party' },
  { label: '✨ Wow', q: 'wow' },
  { label: '👍 Yes', q: 'yes' },
  { label: '🙅 No', q: 'no' },
  { label: '👋 Bye', q: 'bye' },
]

export default function GifPicker({
  open,
  onClose,
  onSelect,
  query,
  onQueryChange,
  results,
  searching,
  error,
  onTrending,
}) {
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Close on Escape or click outside
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, onClose])

  if (!open) return null

  const handleCategoryClick = (cat) => {
    if (!cat.q) {
      onQueryChange('')
      onTrending?.()
    } else {
      onQueryChange(cat.q)
    }
  }

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full right-0 mb-3 w-[400px] max-w-[calc(100vw-24px)] h-[440px] max-h-[72vh] bg-[#141720] border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden select-none"
      style={{
        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)',
      }}
    >
      {/* Header */}
      <div className="p-3 border-b border-white/[0.08] bg-[#10131a] flex flex-col gap-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-white/80">
            <Sparkles size={14} className="text-[#53fc18]" />
            <span className="text-xs font-bold tracking-wide uppercase">GIFs & Reactions</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-lg text-white/40 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X size={14} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 focus-within:border-[#53fc18]/60 focus-within:bg-white/[0.07] transition-all">
          <Search size={14} className="text-white/40 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search Tenor / GIPHY..."
            className="flex-1 bg-transparent text-xs text-white placeholder:text-white/30 outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              className="text-white/30 hover:text-white text-xs p-0.5 rounded cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onQueryChange('')
              onTrending?.()
            }}
            className="flex items-center gap-1 text-[11px] font-semibold text-white/50 hover:text-[#53fc18] transition-colors shrink-0 cursor-pointer pl-1 border-l border-white/10"
            title="Load Trending GIFs"
          >
            <TrendingUp size={12} />
            <span>Trending</span>
          </button>
        </div>

        {/* Quick Tag Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {GIF_CATEGORIES.map((cat) => {
            const isActive = (!cat.q && !query) || (cat.q && query.toLowerCase() === cat.q.toLowerCase())
            return (
              <button
                key={cat.label}
                type="button"
                onClick={() => handleCategoryClick(cat)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#53fc18] text-[#0e1117] shadow-sm font-bold'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/5'
                }`}
              >
                {cat.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* GIFs Grid Area */}
      <div
        className="flex-1 overflow-y-auto p-3 bg-[#0d1017] custom-scrollbar"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#2a2f3d transparent' }}
      >
        {searching && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="relative w-full aspect-[4/3] rounded-xl bg-white/[0.04] animate-pulse border border-white/5 overflow-hidden"
              />
            ))}
          </div>
        )}

        {error && !searching && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-xs text-red-400 font-medium mb-1">Failed to load GIFs</p>
            <p className="text-[10px] text-white/30 max-w-[200px] mb-3">{error}</p>
            <button
              type="button"
              onClick={onTrending}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg text-xs font-semibold transition"
            >
              Try Trending
            </button>
          </div>
        )}

        {!searching && !error && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/20 mb-2">
              <Search size={18} />
            </div>
            <p className="text-xs font-semibold text-white/60">
              {query.trim() ? `No GIFs found for "${query}"` : 'Search for any GIF or reaction'}
            </p>
            <p className="text-[10px] text-white/30 mt-0.5">Type above or tap a mood pill</p>
          </div>
        )}

        {!searching && results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 items-stretch">
            {results.map((gif) => (
              <button
                key={gif.id}
                type="button"
                onClick={() => onSelect(gif)}
                className="relative w-full aspect-[4/3] rounded-xl overflow-hidden block bg-[#161a24] border border-white/5 hover:border-[#53fc18]/70 hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#53fc18] transition-all cursor-pointer group"
                title={gif.title || 'Send GIF'}
              >
                <img
                  src={gif.preview || gif.url}
                  alt={gif.title || 'GIF'}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover block"
                />
                {/* Hover subtle dark gradient with title */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 pointer-events-none">
                  <span className="text-[10px] text-white/90 font-medium truncate leading-tight drop-shadow-sm">
                    {gif.title || 'Send'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 bg-[#10131a] border-t border-white/[0.06] flex items-center justify-between text-[10px] text-white/30 shrink-0">
        <span>Click a GIF to send instantly</span>
        <span className="font-mono tracking-widest text-[#53fc18]/60 font-bold uppercase">GIPHY</span>
      </div>
    </div>
  )
}