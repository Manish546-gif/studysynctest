import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mic, MicOff, Video, VideoOff, Monitor, MessageCircle, Timer } from 'lucide-react'

const SHORTCUTS = [
  { keys: 'Ctrl + M', label: 'Toggle Microphone', icon: Mic },
  { keys: 'Ctrl + D', label: 'Toggle Camera', icon: Video },
  { keys: 'Ctrl + Shift + S', label: 'Toggle Screen Share', icon: Monitor },
  { keys: 'Ctrl + Shift + R', label: 'Toggle Recording', icon: Timer },
  { keys: 'Ctrl + Z', label: 'Undo (Whiteboard)', icon: null },
  { keys: 'Ctrl + Shift + Z', label: 'Redo (Whiteboard)', icon: null },
  { keys: 'Ctrl + Enter', label: 'Send Message', icon: MessageCircle },
  { keys: '?', label: 'Show Shortcuts', icon: null },
]

export default function ShortcutOverlay({ open, onClose }) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape' || e.key === '?') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            className="bg-zoom-dark border border-white/10 rounded-lg w-full max-w-[400px] p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white">Keyboard Shortcuts</h2>
              <button onClick={onClose} className="w-5 h-5 rounded flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition">
                <X size={13} />
              </button>
            </div>

            <div className="space-y-0.5">
              {SHORTCUTS.map((s) => (
                <div key={s.keys} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-white/5 transition">
                  <div className="flex items-center gap-2">
                    {s.icon && <s.icon size={12} className="text-white/30" />}
                    <span className="text-[11px] text-white/70">{s.label}</span>
                  </div>
                  <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] font-mono text-white/50">
                    {s.keys}
                  </kbd>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-white/20 text-center mt-3">Press <kbd className="px-1 py-0.5 bg-white/5 rounded border border-white/10 font-mono">?</kbd> or <kbd className="px-1 py-0.5 bg-white/5 rounded border border-white/10 font-mono">Esc</kbd> to close</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
