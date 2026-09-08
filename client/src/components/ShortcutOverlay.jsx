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
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            className="bg-[#16191e] border border-[#2a2d33] rounded-2xl w-full max-w-[420px] max-h-[80vh] overflow-y-auto p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#e8eaed]">Keyboard Shortcuts</h2>
              <button onClick={onClose} className="w-7 h-7 rounded-xl flex items-center justify-center text-[#9b9e9e] hover:text-[#e8eaed] hover:bg-[#2a2d33] transition">
                <X size={15} />
              </button>
            </div>

            <div className="space-y-1">
              {SHORTCUTS.map((s) => (
                <div key={s.keys} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-[#0e0f13] transition">
                  <div className="flex items-center gap-2.5">
                    {s.icon && <s.icon size={14} className="text-[#53fc18]" />}
                    <span className="text-xs font-semibold text-[#e8eaed]">{s.label}</span>
                  </div>
                  <kbd className="px-2 py-1 bg-[#0e0f13] border border-[#2a2d33] rounded-lg text-xs font-mono text-[#53fc18] font-bold">
                    {s.keys}
                  </kbd>
                </div>
              ))}
            </div>

            <p className="text-xs text-[#9b9e9e]/60 text-center mt-4 pt-3 border-t border-[#2a2d33]">
              Press <kbd className="px-1.5 py-0.5 bg-[#0e0f13] rounded border border-[#2a2d33] font-mono text-[#53fc18]">?</kbd> or <kbd className="px-1.5 py-0.5 bg-[#0e0f13] rounded border border-[#2a2d33] font-mono text-[#53fc18]">Esc</kbd> to close
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
