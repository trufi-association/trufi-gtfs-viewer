import type { ParsedGtfsData } from '../../types/gtfs'

const DB_NAME = 'gtfs-viewer'
const DB_VERSION = 1
const STORE_NAME = 'gtfs-data'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

export async function saveGtfsData(data: ParsedGtfsData): Promise<void> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    // Save each data type separately to avoid size limits
    store.put(data.stops, 'stops')
    store.put(data.routes, 'routes')
    store.put(data.trips, 'trips')
    store.put(data.shapes, 'shapes')
    store.put(data.stopTimes, 'stopTimes')
    store.put(data.calendar, 'calendar')
    store.put(data.calendarDates, 'calendarDates')
    store.put(data.agency, 'agency')
    store.put(data.feedInfo, 'feedInfo')
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

export async function loadGtfsData(): Promise<ParsedGtfsData | null> {
  try {
    const db = await openDatabase()
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)

      const data: Partial<ParsedGtfsData> = {}
      const keys = ['stops', 'routes', 'trips', 'shapes', 'stopTimes', 'calendar', 'calendarDates', 'agency', 'feedInfo']

      let completed = 0
      let hasData = false

      keys.forEach((key) => {
        const request = store.get(key)
        request.onsuccess = () => {
          if (request.result !== undefined) {
            (data as Record<string, unknown>)[key] = request.result
            if (request.result && (Array.isArray(request.result) ? request.result.length > 0 : true)) {
              hasData = true
            }
          }
          completed++
          if (completed === keys.length) {
            db.close()
            if (hasData) {
              resolve(data as ParsedGtfsData)
            } else {
              resolve(null)
            }
          }
        }
        request.onerror = () => {
          completed++
          if (completed === keys.length) {
            db.close()
            resolve(null)
          }
        }
      })
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
