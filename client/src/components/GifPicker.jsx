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
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#16191e] border border-[#2a2d33] rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-[320px]">
      <div className="p-2.5 border-b border-[#2a2d33] flex items-center gap-2 bg-[#0e0f13]">
        <Search size={14} className="text-[#9b9e9e] shrink-0" />
        <input
          autoFocus
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search GIFs..."
          className="flex-1 bg-transparent text-xs text-[#e8eaed] placeholder:text-[#9b9e9e]/50 outline-none"
        />
        <button
          type="button"
          onClick={onTrending}
          className="flex items-center gap-1 text-xs font-semibold text-[#9b9e9e] hover:text-[#53fc18] transition-colors shrink-0"
          title="Trending"
        >
          <TrendingUp size={13} />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-[#9b9e9e] hover:text-[#e8eaed] p-1 rounded-lg hover:bg-[#16191e] transition-colors shrink-0"
          title="Close"
        >
          <span className="text-sm font-bold">&times;</span>
        </button>
      </div>
      <div className="overflow-y-auto p-2.5 grid grid-cols-3 gap-2 min-h-[80px] items-start bg-[#16191e]">
        {searching && (
          <div className="col-span-3 flex items-center justify-center py-6">
            <Loader2 size={20} className="animate-spin text-[#53fc18]" />
          </div>
        )}
        {error && !searching && (
          <div className="col-span-3 text-center py-6 text-xs text-red-400">{error}</div>
        )}
        {!searching && !error && results.length === 0 && (
          <div className="col-span-3 text-center py-6 text-xs text-[#9b9e9e]">
            {query.trim() ? 'No GIFs found' : 'Search for a GIF or load trending'}
          </div>
        )}
        {results.map((gif) => (
          <button
            key={gif.id}
            type="button"
            onClick={() => onSelect(gif)}
            className="rounded-xl overflow-hidden aspect-square hover:ring-2 hover:ring-[#53fc18] transition-all bg-[#0e0f13]"
            title={gif.title || 'GIF'}
          >
            <img src={gif.preview || gif.url} alt={gif.title || 'GIF'} loading="lazy" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  )
}