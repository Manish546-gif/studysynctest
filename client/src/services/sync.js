import { create } from 'zustand'
import { getOps, countOps, removeOp, bumpAttempt } from './syncQueue'

const API_URL = (import.meta.env.VITE_API_URL || '') + '/api'

export const useSyncStore = create((set) => ({
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  queueCount: 0,
  syncing: false,
  setOnline: (online) => set({ online }),
  setQueueCount: (n) => set({ queueCount: n }),
  setSyncing: (s) => set({ syncing: s }),
}))

export function isNetworkError(err) {
  return (
    err instanceof TypeError ||
    err?.name === 'TypeError' ||
    (err?.message && /failed to fetch|network error|load failed/i.test(err.message))
  )
}

function replayOp(op) {
  const token = localStorage.getItem('token')
  const headers = { Authorization: token ? `Bearer ${token}` : '', 'x-client-request-id': op.id }

  if (op.file) {
    const fd = new FormData()
    fd.append('file', op.file)
    return fetch(`${API_URL}${op.path}`, { method: 'POST', headers, body: fd })
  }

  return fetch(`${API_URL}${op.path}`, {
    method: op.method,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: op.body !== undefined ? JSON.stringify(op.body) : undefined,
  })
}

export async function flushSync() {
  const { syncing, online } = useSyncStore.getState()
  if (syncing || !online || typeof navigator === 'undefined') return
  useSyncStore.getState().setSyncing(true)
  try {
    const ops = await getOps()
    for (const op of ops) {
      if (!navigator.onLine) {
        useSyncStore.getState().setOnline(false)
        break
      }
      try {
        const res = await replayOp(op)
        if (!res.ok) throw new Error(`Replay failed: ${res.status}`)
        await removeOp(op.id)
        useSyncStore.getState().setQueueCount(await countOps())
      } catch (err) {
        if (isNetworkError(err) || err?.message?.startsWith('Replay failed: 5') || err?.message === 'Replay failed: 429') {
          break
        }
        const attempts = (op.attempts || 0) + 1
        if (attempts >= 4) {
          await removeOp(op.id)
        } else {
          await bumpAttempt(op.id, attempts)
        }
        useSyncStore.getState().setQueueCount(await countOps())
      }
    }
  } finally {
    useSyncStore.getState().setSyncing(false)
  }
}

export async function refreshQueueCount() {
  if (typeof indexedDB === 'undefined') return
  try {
    useSyncStore.getState().setQueueCount(await countOps())
  } catch {
    useSyncStore.getState().setQueueCount(0)
  }
}

export function initSyncWatchers() {
  if (typeof window === 'undefined') return
  const handleOnline = () => {
    useSyncStore.getState().setOnline(true)
    refreshQueueCount().then(flushSync)
  }
  const handleOffline = () => useSyncStore.getState().setOnline(false)
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  setInterval(() => {
    const { online, queueCount, syncing } = useSyncStore.getState()
    if (online && queueCount > 0 && !syncing) flushSync()
  }, 15000)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}
