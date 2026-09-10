import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Palette, Check } from 'lucide-react'
import { api } from '../services/api'

const PRESET_COLORS = [
  { name: 'Volt Green', value: '#53fc18' },
  { name: 'Electric Blue', value: '#3d8bff' },
  { name: 'Purple', value: '#a78bfa' },
  { name: 'Hot Pink', value: '#f472b6' },
  { name: 'Orange', value: '#ff9f43' },
  { name: 'Red', value: '#ff4f4f' },
  { name: 'Cyan', value: '#22d3ee' },
  { name: 'Gold', value: '#fbbf24' },
]

export default function ThemePickerModal({ isOpen, onClose, roomId, currentColor = '#53fc18', socket }) {
  const [selected, setSelected] = useState(currentColor)
  const [customHex, setCustomHex] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setSelected(currentColor)
      setCustomHex('')
      setError('')
    }
  }, [isOpen, currentColor])

  const handleApply = async (color) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
      setError('Enter a valid 6-digit hex color (e.g. #ff4f4f)')
      return
    }
    setSaving(true)
    setError('')
    try {
      // Broadcast via socket immediately for instant reactive update
      socket?.emit('set-room-theme', { roomId, accentColor: color })
      // Persist to database via API
      try {
        await api.setRoomTheme(roomId, color)
      } catch (apiErr) {
        console.warn('REST setRoomTheme fallback:', apiErr.message)
      }
      onClose(color)
    } catch (e) {
      setError(e.message || 'Failed to save theme')
    } finally {
      setSaving(false)
    }
  }

  const activeColor = customHex.match(/^#[0-9a-fA-F]{6}$/) ? customHex : selected

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={(e) => e.target === e.currentTarget && onClose(null)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-80 rounded-2xl border border-[#2a2d33] shadow-2xl overflow-hidden"
            style={{ background: '#16191e' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d33]">
              <div className="flex items-center gap-2">
                <Palette size={16} style={{ color: activeColor }} />
                <h3 className="text-sm font-bold text-[#e8eaed]">Room Theme</h3>
              </div>
              <button onClick={() => onClose(null)} className="text-[#9b9e9e] hover:text-[#e8eaed] transition-colors">
                <X size={15} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-5">
              {/* Preview bar */}
              <div className="h-1.5 rounded-full" style={{ background: activeColor }} />

              {/* Preset swatches */}
              <div>
                <p className="text-[10px] font-bold text-[#9b9e9e] uppercase tracking-wider mb-3">Presets</p>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => { setSelected(c.value); setCustomHex('') }}
                      title={c.name}
                      className="relative w-full aspect-square rounded-xl transition-transform hover:scale-110 active:scale-95"
                      style={{ background: c.value }}
                    >
                      {selected === c.value && !customHex && (
                        <motion.div
                          layoutId="check"
                          className="absolute inset-0 flex items-center justify-center rounded-xl"
                          style={{ background: 'rgba(0,0,0,0.35)' }}
                        >
                          <Check size={14} className="text-white" />
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom hex */}
              <div>
                <p className="text-[10px] font-bold text-[#9b9e9e] uppercase tracking-wider mb-2">Custom Hex</p>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={activeColor}
                    onChange={(e) => setCustomHex(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={customHex || selected}
                    onChange={(e) => setCustomHex(e.target.value)}
                    placeholder="#53fc18"
                    maxLength={7}
                    className="flex-1 px-3 py-2 rounded-xl bg-[#0e0f13] border border-[#2a2d33] text-sm text-[#e8eaed] font-mono focus:outline-none focus:border-[#53fc18] transition-colors"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              {/* Apply button */}
              <button
                onClick={() => handleApply(activeColor)}
                disabled={saving}
                className="w-full py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: activeColor, color: '#0e0f13' }}
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                {saving ? 'Applying…' : 'Apply Theme'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
