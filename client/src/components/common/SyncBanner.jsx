import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff, CloudUpload, Download, RefreshCw, X } from 'lucide-react';
import { useSyncStore, flushSync, refreshQueueCount, isNetworkError } from '../../services/sync';
import { usePwaStore, installApp } from '../../services/pwa';

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
  const offlineReady = usePwaStore((s) => s.offlineReady);
  const canInstall = usePwaStore((s) => s.canInstall);
  const installHint = usePwaStore((s) => s.installHint);
  const dismissed = usePwaStore((s) => s.dismissed);
  const setDismissed = usePwaStore((s) => s.setDismissed);

  useEffect(() => {
    refreshQueueCount();
  }, []);

  const handleInstall = () => {
    if (!installApp()) {
      setTimeout(() => usePwaStore.getState().setInstallHint(''), 6000);
    }
  };

  const showOffline = !online;
  const showPending = online && queueCount > 0;

  if (!showOffline && !showPending && !offlineReady && !canInstall) return null;

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

      <AnimatePresence>
        {(canInstall || offlineReady) && !dismissed && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="flex items-center gap-3 pl-4 pr-2 py-2 rounded-2xl bg-surface-container-low text-on-surface shadow-xl border border-outline-variant/30 pointer-events-auto"
          >
            {canInstall ? (
              <Download size={16} className="text-primary shrink-0" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
            )}
            <p className="text-xs font-medium">
              {canInstall ? 'Install StudySync to use it offline' : 'StudySync is ready to work offline'}
            </p>
            {canInstall && (
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                <Download size={13} /> Install
              </button>
            )}
            {installHint && (
              <span className="text-xs text-on-surface/50 font-medium">{installHint}</span>
            )}
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 rounded-lg text-on-surface/40 hover:bg-surface-container hover:text-on-surface transition-colors"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
