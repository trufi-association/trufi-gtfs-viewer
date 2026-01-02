import { useEffect } from 'react'
import Layout from './components/Layout'
import { useGtfsStore } from './store/gtfsStore'

function App() {
  const { feedStats, loadFromStorage } = useGtfsStore()

  // Load GTFS data from IndexedDB on startup
  useEffect(() => {
    if (!feedStats) {
      loadFromStorage()
    }
  }, [feedStats, loadFromStorage])

  return <Layout />
}

export default App
