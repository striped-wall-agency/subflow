const DATABASE = 'subflow-demo'
const STORE = 'state'

/** Keep the entire demo snapshot in one transaction so changes commit together. */
export async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Database upgrade is blocked by another tab.'))
  })
}

export async function readSnapshot<T>(database: IDBDatabase): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readonly')
    const request = transaction.objectStore(STORE).get('snapshot')
    request.onsuccess = () => resolve(request.result as T | undefined)
    transaction.onabort = () => reject(transaction.error)
    request.onerror = () => reject(request.error)
  })
}

export async function writeSnapshot<T>(database: IDBDatabase, snapshot: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite')
    transaction.objectStore(STORE).put(snapshot, 'snapshot')
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error)
    transaction.onerror = () => reject(transaction.error)
  })
}
