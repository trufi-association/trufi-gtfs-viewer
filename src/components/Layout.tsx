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
    <div className="h-screen flex flex-col">
      {/* Mobile header */}
      <header className="md:hidden bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
        <h1 className="font-bold text-gray-800">GTFS Viewer</h1>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          {sidebarOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            md:translate-x-0 md:relative
            absolute z-20 h-full
            w-80 bg-white border-r shadow-lg md:shadow-none
            transition-transform duration-200 ease-in-out
            flex flex-col
          `}
        >
          <div className="flex-1 overflow-y-auto">
            <Sidebar />
            <TimetablePanel />
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-10"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 flex flex-col relative">
          {/* Map */}
          <div className="flex-1 relative">
            <Map />
          </div>

          {/* Time slider at bottom */}
          {feedStats && <TimeSlider />}
        </main>
      </div>
    </div>
  )
}

export default Layout
