import { registerSW } from 'virtual:pwa-register';
import { create } from 'zustand';
import { flushSync, initSyncWatchers } from './sync';

function isDismissed() {
  try {
    return sessionStorage.getItem('pwaBannerDismissed') === '1';
  } catch {
    return false;
  }
}

export const usePwaStore = create((set) => ({
  offlineReady: false,
  canInstall: false,
  installHint: '',
  dismissed: typeof sessionStorage !== 'undefined' && isDismissed(),
  setOfflineReady: (v) => set({ offlineReady: v }),
  setCanInstall: (v) => set({ canInstall: v }),
  setInstallHint: (v) => set({ installHint: v }),
  setDismissed: (v) => {
    try {
      if (v) sessionStorage.setItem('pwaBannerDismissed', '1');
      else sessionStorage.removeItem('pwaBannerDismissed');
    } catch {
      /* ignore */
    }
    set({ dismissed: v });
  },
}));

let installPrompt = null;

export function installApp() {
  if (!installPrompt) {
    usePwaStore
      .getState()
      .setInstallHint('Look for the install icon (⊕) in your browser\u2019s address bar.');
    return false;
  }
  installPrompt.prompt();
  installPrompt.userChoice?.finally(() => {
    installPrompt = null;
    usePwaStore.getState().setCanInstall(false);
  });
  return true;
}

function refreshInstallState() {
  if (typeof window === 'undefined') return;
  const standalone = window.matchMedia('(display-mode: standalone)').matches;
  if (standalone) {
    installPrompt = null;
    usePwaStore.getState().setCanInstall(false);
    return;
  }
  if (installPrompt || navigator.serviceWorker?.controller) {
    usePwaStore.getState().setCanInstall(true);
  }
}

if (typeof window !== 'undefined') {
  initSyncWatchers();

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt = e;
    usePwaStore.getState().setCanInstall(true);
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    usePwaStore.getState().setCanInstall(false);
  });

  if ('serviceWorker' in navigator) {
    registerSW({
      immediate: true,
      onOfflineReady: () => usePwaStore.getState().setOfflineReady(true),
      onRegisteredSW: (_swUrl, _reg) => {
        navigator.serviceWorker?.addEventListener('message', (ev) => {
          if (ev.data?.type === 'STUDYSYNC_SYNC') flushSync();
        });
        setTimeout(refreshInstallState, 1500);
      },
    });
  }
}
