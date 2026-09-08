import { useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const CONFIRM_STYLES = {
  danger: 'bg-red-500 text-white hover:bg-red-600 font-bold',
  primary: 'bg-[#53fc18] text-black hover:bg-[#48de13] font-bold shadow-[0_0_12px_rgba(83,252,24,0.3)]',
};

export default function ConfirmationModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  confirmVariant = 'primary',
  loading = false,
}) {
  const dialogRef = useRef(null);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose?.();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return undefined;

    const prevActive = document.activeElement;
    document.addEventListener('keydown', handleKeyDown);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const focusTimer = setTimeout(() => {
      const firstFocusable = dialogRef.current?.querySelector('button');
      firstFocusable?.focus();
    }, 0);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = overflow;
      clearTimeout(focusTimer);
      prevActive?.focus?.();
    };
  }, [open, handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !loading) onClose?.();
          }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmation-modal-title"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="w-[400px] max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto rounded-2xl bg-[#16191e] border border-[#2a2d33] shadow-2xl p-6 shrink-0"
          >
            <h2
              id="confirmation-modal-title"
              className="text-base font-bold text-[#e8eaed]"
            >
              {title}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-[#9b9e9e]">
              {message}
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#2a2d33] text-[#e8eaed] hover:bg-[#34383f] transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs transition-all disabled:opacity-50 disabled:pointer-events-none ${
                  CONFIRM_STYLES[confirmVariant] || CONFIRM_STYLES.primary
                }`}
              >
                {loading && (
                  <span className="size-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
