import { useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const CONFIRM_STYLES = {
  danger: 'bg-error text-on-error hover:opacity-90',
  primary: 'bg-primary text-on-primary hover:opacity-90',
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-inverse-surface/30"
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
            className="w-full max-w-sm rounded-3xl bg-surface-container-low border border-outline-variant/30 shadow-2xl p-6"
          >
            <h2
              id="confirmation-modal-title"
              className="text-lg font-semibold text-on-surface"
            >
              {title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-on-surface/60">
              {message}
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-surface-container-high text-on-surface hover:opacity-90 transition-opacity disabled:opacity-50 disabled:pointer-events-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50 disabled:pointer-events-none ${
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
