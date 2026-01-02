const DB_NAME = 'gtfs-viewer'
const DB_VERSION = 2
const STORE_NAME = 'gtfs-file'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      // Delete old store if exists
      if (db.objectStoreNames.contains('gtfs-data')) {
        db.deleteObjectStore('gtfs-data')
      }
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

export async function saveGtfsFile(file: File): Promise<void> {
  const db = await openDatabase()
  const arrayBuffer = await file.arrayBuffer()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    store.put(arrayBuffer, 'fileData')
    store.put(file.name, 'fileName')
    store.put(file.type || 'application/zip', 'fileType')
    store.put(Date.now(), 'savedAt')

    transaction.oncomplete = () => {
      db.close()
      resolve()
    }
    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

export async function loadGtfsFile(): Promise<File | null> {
  try {
    const db = await openDatabase()
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)

      let fileData: ArrayBuffer | undefined
      let fileName: string | undefined
      let fileType: string | undefined
      let completed = 0

      const checkComplete = () => {
        completed++
        if (completed === 3) {
          db.close()
          if (fileData && fileName) {
            const file = new File([fileData], fileName, { type: fileType || 'application/zip' })
            resolve(file)
          } else {
            resolve(null)
          }
        }
      }

      const dataRequest = store.get('fileData')
      dataRequest.onsuccess = () => {
        fileData = dataRequest.result
        checkComplete()
      }
      dataRequest.onerror = checkComplete

      const nameRequest = store.get('fileName')
      nameRequest.onsuccess = () => {
        fileName = nameRequest.result
        checkComplete()
      }
      nameRequest.onerror = checkComplete

      const typeRequest = store.get('fileType')
      typeRequest.onsuccess = () => {
        fileType = typeRequest.result
        checkComplete()
      }
      typeRequest.onerror = checkComplete
    })
  } catch {
    return null
  }
}

export async function clearGtfsData(): Promise<void> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.clear()

    request.onsuccess = () => {
      db.close()
      resolve()
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

export async function hasStoredData(): Promise<boolean> {
  try {
    const db = await openDatabase()
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get('savedAt')

      request.onsuccess = () => {
        db.close()
        resolve(request.result !== undefined)
      }
      request.onerror = () => {
        db.close()
        resolve(false)
      }
    })
  } catch {
    return false
  }
}
