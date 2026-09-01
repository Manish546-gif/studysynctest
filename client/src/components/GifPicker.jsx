import React from 'react'
import { Loader2, Search, TrendingUp } from 'lucide-react'
import { api } from '../services/api'

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
  if (!open) return null

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-zoom-darker border border-white/10 rounded-lg shadow-2xl overflow-hidden z-50 flex flex-col max-h-[320px]">
      <div className="p-2 border-b border-white/10 flex items-center gap-1.5">
        <Search size={13} className="text-white/40 shrink-0" />
        <input
          autoFocus
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search GIFs..."
          className="flex-1 bg-transparent text-xs text-white placeholder:text-white/30 outline-none"
        />
        <button
          type="button"
          onClick={onTrending}
          className="flex items-center gap-1 text-[10px] text-white/50 hover:text-white/80 transition-colors shrink-0"
          title="Trending"
        >
          <TrendingUp size={11} />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-white/40 hover:text-white/80 p-0.5 rounded transition-colors shrink-0"
          title="Close"
        >
          <span className="text-xs">&times;</span>
        </button>
      </div>
      <div className="overflow-y-auto p-2 grid grid-cols-3 gap-1.5 min-h-[80px] items-start">
        {searching && (
          <div className="col-span-3 flex items-center justify-center py-6">
            <Loader2 size={18} className="animate-spin text-zoom-blue" />
          </div>
        )}
        {error && !searching && (
          <div className="col-span-3 text-center py-6 text-[11px] text-red-400">{error}</div>
        )}
        {!searching && !error && results.length === 0 && (
          <div className="col-span-3 text-center py-6 text-[11px] text-white/40">
            {query.trim() ? 'No GIFs found' : 'Search for a GIF or load trending'}
          </div>
        )}
        {results.map((gif) => (
          <button
            key={gif.id}
            type="button"
            onClick={() => onSelect(gif)}
            className="rounded overflow-hidden aspect-square hover:ring-2 hover:ring-zoom-blue transition-all bg-black/20"
            title={gif.title || 'GIF'}
          >
            <img src={gif.preview || gif.url} alt={gif.title || 'GIF'} loading="lazy" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  )
}