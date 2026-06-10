const DB_NAME = 'slideshow-maker'
const STORE_NAME = 'recent-projects'
const DB_VERSION = 1
const MAX_RECENT = 10

export type RecentProject = {
  name: string
  handle: FileSystemDirectoryHandle
  lastOpenedAt: number
}

function openDb(idb: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = idb.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'name' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function addRecentProject(
  handle: FileSystemDirectoryHandle,
  idb: IDBFactory = globalThis.indexedDB,
): Promise<void> {
  const db = await openDb(idb)
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put({ name: handle.name, handle, lastOpenedAt: Date.now() })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function listRecentProjects(
  idb: IDBFactory = globalThis.indexedDB,
): Promise<RecentProject[]> {
  const db = await openDb(idb)
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => {
      const all = (req.result as RecentProject[]).sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
      resolve(all.slice(0, MAX_RECENT))
    }
    req.onerror = () => reject(req.error)
  })
}

export async function removeRecentProject(
  name: string,
  idb: IDBFactory = globalThis.indexedDB,
): Promise<void> {
  const db = await openDb(idb)
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(name)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Requests readwrite permission for a stored handle; needed when re-opening
// a recent project after a page reload (browser resets permission state).
export async function requestHandlePermission(
  handle: FileSystemDirectoryHandle,
): Promise<'granted' | 'denied'> {
  const status = await handle.queryPermission({ mode: 'readwrite' })
  if (status === 'granted') return 'granted'
  const result = await handle.requestPermission({ mode: 'readwrite' })
  return result === 'granted' ? 'granted' : 'denied'
}
