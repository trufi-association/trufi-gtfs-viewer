import { useEffect } from 'react'
import Layout from './components/Layout'
import { useGtfsStore } from './store/gtfsStore'

function App() {
  const { loadFromStorage, feedStats } = useGtfsStore()

  // Load GTFS data from IndexedDB on startup
  useEffect(() => {
    if (!feedStats) {
      loadFromStorage()
    }
  }, [])

  return <Layout />
}

export default App
