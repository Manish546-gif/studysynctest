import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

let idCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback((message, type = 'info', opts = {}) => {
    const id = ++idCounter
    const toast = { id, message, type, ...opts }
    setToasts((t) => [...t.slice(-4), toast])
    if (!opts.persist) {
      const duration = opts.duration || (type === 'error' ? 5000 : 3000)
      setTimeout(() => dismiss(id), duration)
    }
    return id
  }, [dismiss])

  const value = useMemo(() => ({ toast: push, dismiss }), [push, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 items-end pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto w-72 max-w-[calc(100vw-2rem)] rounded-xl shadow-lg shadow-black/20 border text-white overflow-hidden"
              style={{
                background: t.type === 'error' ? '#dc2626' : t.type === 'success' ? '#16a34a' : t.type === 'warning' ? '#d97706' : '#2b2935',
                borderColor: t.type === 'error' ? '#fca5a5' : t.type === 'success' ? '#86efac' : t.type === 'warning' ? '#fcd34d' : 'rgba(255,255,255,0.15)',
              }}
            >
              <div className="flex items-start gap-2.5 px-3 py-2.5">
                <span className="mt-0.5 shrink-0">
                  {t.type === 'success' ? <CheckCircle2 size={15} /> : t.type === 'error' ? <AlertCircle size={15} /> : t.type === 'warning' ? <AlertCircle size={15} /> : <Info size={15} />}
                </span>
                <p className="text-xs leading-relaxed flex-1 min-w-0 break-words">{t.message}</p>
                <button
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 text-white/60 hover:text-white transition-colors"
                  aria-label="Dismiss"
                >
                  <X size={13} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
