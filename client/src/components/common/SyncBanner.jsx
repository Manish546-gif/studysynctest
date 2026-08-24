import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff, CloudUpload, RefreshCw } from 'lucide-react';
import { useSyncStore, flushSync, refreshQueueCount, isNetworkError } from '../../services/sync';

function describeError(err) {
  const status = /Replay failed: (\d+)/.exec(err?.message || '')?.[1];
  if (status === '429') return 'Rate limited — will retry automatically';
  if (status) return `Server error (${status}) — will retry automatically`;
  if (isNetworkError(err)) return 'Can\u2019t reach the server — will retry automatically';
  return err?.message || 'Sync failed';
}

export default function SyncBanner() {
  const online = useSyncStore((s) => s.online);
  const queueCount = useSyncStore((s) => s.queueCount);
  const syncing = useSyncStore((s) => s.syncing);
  const lastError = useSyncStore((s) => s.lastError);

  useEffect(() => {
    refreshQueueCount();
  }, []);

  const showOffline = !online;
  const showPending = online && queueCount > 0;

  if (!showOffline && !showPending) return null;

  return (
    <div className="fixed top-20 inset-x-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none">
      <AnimatePresence>
        {(showOffline || showPending) && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="flex items-center gap-3 pl-4 pr-2 py-2 rounded-2xl bg-inverse-surface text-surface shadow-2xl border border-outline-variant/30 pointer-events-auto"
          >
            {!online ? (
              <WifiOff size={16} className="text-[var(--color-inverse-primary)] shrink-0" />
            ) : syncing ? (
              <RefreshCw size={16} className="text-[var(--color-inverse-primary)] shrink-0 animate-spin" />
            ) : (
              <CloudUpload size={16} className="text-[var(--color-inverse-primary)] shrink-0" />
            )}
            <div className="flex flex-col">
              <p className="text-xs font-medium">
                {!online
                  ? queueCount > 0
                    ? `You're offline — ${queueCount} ${queueCount === 1 ? 'change' : 'changes'} will sync automatically`
                    : "You're offline — changes will sync automatically"
                  : syncing
                    ? 'Syncing your changes…'
                    : `${queueCount} ${queueCount === 1 ? 'change' : 'changes'} waiting to sync`}
              </p>
              {lastError && (
                <span
                  className="text-[10px] text-inverse-primary/80 max-w-[300px] truncate"
                  title={lastError.path}
                >
                  {describeError(lastError)} · {lastError.path}
                </span>
              )}
            </div>
            {online && queueCount > 0 && !syncing && (
              <button
                onClick={flushSync}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface text-inverse-surface text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                <CloudUpload size={13} /> Sync now
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
