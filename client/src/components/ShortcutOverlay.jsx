import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mic, MicOff, Video, VideoOff, Monitor, MessageCircle, Pencil, Timer } from 'lucide-react'

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
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-surface-container-high border border-outline-variant/20 rounded-2xl w-full max-w-[480px] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-on-surface">Keyboard Shortcuts</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface/40 hover:bg-surface-container transition">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1">
              {SHORTCUTS.map((s) => (
                <div key={s.keys} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-surface-container/50 transition">
                  <div className="flex items-center gap-3">
                    {s.icon && <s.icon size={16} className="text-on-surface/40" />}
                    <span className="text-sm text-on-surface">{s.label}</span>
                  </div>
                  <kbd className="px-2.5 py-1 bg-surface border border-outline-variant/30 rounded-lg text-xs font-mono text-on-surface/70 font-medium">
                    {s.keys}
                  </kbd>
                </div>
              ))}
            </div>

            <p className="text-xs text-on-surface/30 text-center mt-4">Press <kbd className="px-1.5 py-0.5 bg-surface rounded border border-outline-variant/30 font-mono">?</kbd> or <kbd className="px-1.5 py-0.5 bg-surface rounded border border-outline-variant/30 font-mono">Esc</kbd> to close</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
