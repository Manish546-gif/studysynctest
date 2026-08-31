const DB_NAME = 'studysync-offline'
const STORE = 'ops'

let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function reqResult(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function enqueueOp(op) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)

    if (op.dedupeKey) {
      store.getAll().onsuccess = (e) => {
        const match = e.target.result.find((o) => o.dedupeKey === op.dedupeKey)
        if (match) {
          store.put({ ...match, body: op.body, updatedAt: Date.now() })
        } else {
          store.put({ ...op, createdAt: Date.now(), attempts: 0 })
        }
      }
    } else {
      store.put({ ...op, createdAt: Date.now(), attempts: 0 })
    }

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function getOps() {
  const db = await openDB()
  const tx = db.transaction(STORE, 'readonly')
  const all = await reqResult(tx.objectStore(STORE).getAll())
  return all.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
}

export async function countOps() {
  const db = await openDB()
  const tx = db.transaction(STORE, 'readonly')
  return reqResult(tx.objectStore(STORE).count())
}

export async function removeOp(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function bumpAttempt(id, attempts) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    store.get(id).onsuccess = (e) => {
      const op = e.target.result
      if (op) {
        op.attempts = attempts
        op.lastAttemptAt = Date.now()
        store.put(op)
      }
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}
