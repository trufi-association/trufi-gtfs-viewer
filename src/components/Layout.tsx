import { useState } from 'react'
import Map from './map/Map'
import Sidebar from './sidebar/Sidebar'
import TimeSlider from './timetable/TimeSlider'
import TimetablePanel from './timetable/TimetablePanel'
import { useGtfsStore } from '../store/gtfsStore'

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { feedStats } = useGtfsStore()

  return (
    <div className="app-layout">
      {/* Mobile header */}
      <header className="mobile-header">
        <h1>GTFS Viewer</h1>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="btn btn-ghost btn-icon"
        >
          {sidebarOpen ? (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </header>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-inner">
          <Sidebar />
          <TimetablePanel />
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="main-content">
        {/* Map */}
        <div className="map-container">
          <Map />
        </div>

        {/* Time slider at bottom */}
        {feedStats && <TimeSlider />}
      </main>
    </div>
  )
}

export default Layout
