import { useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const CONFIRM_STYLES = {
  danger: 'bg-red-500 text-white hover:bg-red-600',
  primary: 'bg-zoom-blue text-white hover:bg-[#0b5fc7]',
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

    // Auto-focus the first focusable element (cancel button) inside the dialog
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70"
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
            className="w-[380px] max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto rounded-lg bg-zoom-dark border border-white/10 shadow-2xl p-5 shrink-0"
          >
            <h2
              id="confirmation-modal-title"
              className="text-sm font-semibold text-white"
            >
              {title}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-white/50">
              {message}
            </p>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-white/80 hover:bg-white/15 transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none ${
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
