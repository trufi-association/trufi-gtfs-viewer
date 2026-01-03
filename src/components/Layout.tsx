import { useState, useMemo } from 'react'
import Map from './map/Map'
import { useGtfsStore } from '../store/gtfsStore'
import { useTimetableStore } from '../store/timetableStore'
import { useUiStore } from '../store/uiStore'
import { formatTime } from '../services/gtfs/vehicleInterpolator'
import { ROUTE_TYPES } from '../types/gtfs'
import type { GtfsRoute, GtfsTrip, GtfsStopTime, GtfsShape, GtfsStop, GtfsCalendar, GtfsFrequency } from '../types/gtfs'
import DropZone from './upload/DropZone'

export function Layout() {
  const [qualityModalOpen, setQualityModalOpen] = useState(false)

  const { feedStats, routes, trips, stopTimes, shapes, stops, calendar, frequencies } = useGtfsStore()
  const {
    currentTimeSeconds,
    selectedDate,
    isPlaying,
    playbackSpeed,
    filteredVehicleCount,
    setCurrentTime,
    setSelectedDate,
    togglePlayback,
    setPlaybackSpeed,
    nextDay,
    prevDay,
  } = useTimetableStore()
  const {
    selectedRouteIds,
    selectedRouteTypes,
    toggleRouteSelection,
    toggleRouteType,
    clearRouteSelection,
    clearRouteTypeFilter,
    searchQuery,
    setSearchQuery,
  } = useUiStore()

  const availableRouteTypes = useMemo(() => {
    const types = new Set(routes.map((r) => r.route_type))
    return Array.from(types).sort((a, b) => a - b)
  }, [routes])

  const filteredRoutes = useMemo(() => {
    const query = searchQuery.toLowerCase()
    return routes.filter((route) => {
      const shortName = String(route.route_short_name ?? '').toLowerCase()
      const longName = String(route.route_long_name ?? '').toLowerCase()
      const matchesSearch = !searchQuery || shortName.includes(query) || longName.includes(query)
      const matchesType = selectedRouteTypes.size === 0 || selectedRouteTypes.has(route.route_type)
      return matchesSearch && matchesType
    })
  }, [routes, searchQuery, selectedRouteTypes])

  // Calculate route stats
  const routeStats = useMemo(() => {
    const stats: Record<string, { tripCount: number; stopCount: number }> = {}

    for (const route of routes) {
      const routeTrips = trips.filter(t => t.route_id === route.route_id)
      const routeStopIds = new Set<string>()

      for (const trip of routeTrips) {
        const tripStops = stopTimes.filter(st => st.trip_id === trip.trip_id)
        for (const st of tripStops) {
          routeStopIds.add(st.stop_id)
        }
      }

      stats[route.route_id] = {
        tripCount: routeTrips.length,
        stopCount: routeStopIds.size
      }
    }

    return stats
  }, [routes, trips, stopTimes])

  const progressPercent = (currentTimeSeconds / 86400) * 100
  const speeds = [1, 2, 5, 10, 30, 60]

  const overallScore = useMemo(() => {
    if (!feedStats) return null
    const routesWithShapes = new Set(trips.filter(t => t.shape_id).map(t => t.route_id)).size
    const shapesCoverage = routes.length > 0 ? Math.round((routesWithShapes / routes.length) * 100) : 0
    const stopsWithCoords = stops.filter(s => s.stop_lat && s.stop_lon).length
    const stopsCoordsCoverage = stops.length > 0 ? Math.round((stopsWithCoords / stops.length) * 100) : 0
    const tripsWithStops = new Set(stopTimes.map(st => st.trip_id))
    const tripsCoverage = trips.length > 0 ? Math.round((tripsWithStops.size / trips.length) * 100) : 0
    const stopsWithNames = stops.filter(s => s.stop_name?.trim()).length
    const namesCoverage = stops.length > 0 ? Math.round((stopsWithNames / stops.length) * 100) : 0
    const calendarCoverage = calendar.length > 0 ? 100 : 0
    const scores = [shapesCoverage, stopsCoordsCoverage, tripsCoverage, namesCoverage, calendarCoverage]
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }, [feedStats, routes, trips, stopTimes, stops, calendar])

  const getScoreClass = (score: number) => {
    if (score >= 80) return 'good'
    if (score >= 50) return 'warn'
    return 'bad'
  }

  // Upload/Loading state
  if (!feedStats) {
    return (
      <div className="simulator-layout">
        <div className="upload-screen">
          <div className="upload-card">
            <div className="upload-header">
              <div className="upload-logo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="upload-title">GTFS Simulator</h1>
              <p className="upload-subtitle">Visualize transit routes and schedules in real-time</p>
            </div>
            <DropZone />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="simulator-layout">
      {/* Left Sidebar - Routes */}
      <aside className="routes-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="brand-title">GTFS Simulator</div>
              <div className="brand-subtitle">{routes.length} routes loaded</div>
            </div>
          </div>
          <div className="search-box">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search routes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {availableRouteTypes.length > 1 && (
          <div className="route-filters">
            {availableRouteTypes.map((type) => (
              <button
                key={type}
                onClick={() => toggleRouteType(type)}
                className={`filter-tag ${selectedRouteTypes.has(type) ? 'active' : ''}`}
              >
                {ROUTE_TYPES[type] || `Type ${type}`}
              </button>
            ))}
            {selectedRouteTypes.size > 0 && (
              <button onClick={clearRouteTypeFilter} className="filter-tag">
                Clear
              </button>
            )}
          </div>
        )}

        <div className="routes-list">
          <div className="routes-count">
            <span>{filteredRoutes.length} of {routes.length} routes</span>
            {selectedRouteIds.size > 0 && (
              <button className="clear-selection" onClick={clearRouteSelection}>
                Clear ({selectedRouteIds.size})
              </button>
            )}
          </div>

          {filteredRoutes.map((route) => {
            const colorStr = String(route.route_color ?? '')
            const color = colorStr ? (colorStr.startsWith('#') ? colorStr : `#${colorStr}`) : '#3b82f6'
            const isSelected = selectedRouteIds.has(route.route_id)
            const stats = routeStats[route.route_id]

            return (
              <button
                key={route.route_id}
                onClick={() => toggleRouteSelection(route.route_id)}
                className={`route-card ${isSelected ? 'selected' : ''}`}
              >
                <div className="route-card-header">
                  <div className="route-card-id" style={{ backgroundColor: color }}>
                    {route.route_short_name || route.route_id}
                  </div>
                  <span className="route-card-type">{ROUTE_TYPES[route.route_type] || `Type ${route.route_type}`}</span>
                </div>
                {route.route_long_name && (
                  <div className="route-card-name">{route.route_long_name}</div>
                )}
                {stats && (stats.tripCount > 0 || stats.stopCount > 0) && (
                  <div className="route-card-stats">
                    <span className="route-stat">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {stats.tripCount} trips
                    </span>
                    <span className="route-stat">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {stats.stopCount} stops
                    </span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </aside>

      {/* Map Area */}
      <div className="map-area">
        <div className="map-container">
          <Map />
        </div>

        {/* Vehicles indicator */}
        <div className="vehicles-indicator">
          <span className="vehicles-dot" />
          <span className="vehicles-count">{filteredVehicleCount}</span>
          <span className="vehicles-label">vehicles</span>
        </div>
      </div>

      {/* Timeline Panel */}
      <div className="timeline-panel">
        {/* Play controls */}
        <div className="play-section">
          <button className="play-btn" onClick={togglePlayback} title={isPlaying ? 'Pausar' : 'Reproducir'}>
            {isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>

        {/* Time display */}
        <div className="time-section">
          <span className="time-value">{formatTime(Math.floor(currentTimeSeconds))}</span>
          <span className="time-date">
            {selectedDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </div>

        {/* Vehicles badge */}
        <div className="vehicles-badge">
          <span className="vehicles-badge-dot" />
          <span className="vehicles-badge-count">{filteredVehicleCount}</span>
          <span className="vehicles-badge-label">activos</span>
        </div>

        {/* Timeline slider */}
        <div className="timeline-track">
          <div className="timeline-slider">
            <div className="timeline-progress" style={{ width: `${progressPercent}%` }} />
            <input
              type="range"
              className="timeline-input"
              min={0}
              max={86400}
              step={60}
              value={currentTimeSeconds}
              onChange={(e) => setCurrentTime(Number(e.target.value))}
              title="Arrastrar para cambiar la hora"
            />
          </div>
          <div className="timeline-markers">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </div>
        </div>

        {/* Speed selector */}
        <div className="speed-section">
          <span className="speed-label">Velocidad</span>
          <div className="speed-options">
            {speeds.map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`speed-btn ${playbackSpeed === speed ? 'active' : ''}`}
                title={`${speed}x velocidad`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Quality Modal */}
      {qualityModalOpen && (
        <QualityModalContent
          feedStats={feedStats}
          routes={routes}
          trips={trips}
          stopTimes={stopTimes}
          shapes={shapes}
          stops={stops}
          calendar={calendar}
          frequencies={frequencies}
          onClose={() => setQualityModalOpen(false)}
        />
      )}
    </div>
  )
}

interface FeedStatsType {
  stopCount: number
  routeCount: number
  tripCount: number
}

function QualityModalContent({ feedStats, routes, trips, stopTimes, shapes, stops, calendar, frequencies, onClose }: {
  feedStats: FeedStatsType
  routes: GtfsRoute[]
  trips: GtfsTrip[]
  stopTimes: GtfsStopTime[]
  shapes: GtfsShape[]
  stops: GtfsStop[]
  calendar: GtfsCalendar[]
  frequencies: GtfsFrequency[]
  onClose: () => void
}) {
  const routesWithShapes = new Set(trips.filter((t) => t.shape_id).map((t) => t.route_id)).size
  const shapesCoverage = routes.length > 0 ? Math.round((routesWithShapes / routes.length) * 100) : 0
  const stopsCoordsCoverage = stops.length > 0 ? Math.round((stops.filter((s) => s.stop_lat && s.stop_lon).length / stops.length) * 100) : 0
  const tripsWithStops = new Set(stopTimes.map((st) => st.trip_id))
  const tripsCoverage = trips.length > 0 ? Math.round((tripsWithStops.size / trips.length) * 100) : 0
  const namesCoverage = stops.length > 0 ? Math.round((stops.filter((s) => s.stop_name?.trim()).length / stops.length) * 100) : 0
  const colorsCoverage = routes.length > 0 ? Math.round((routes.filter((r) => r.route_color).length / routes.length) * 100) : 0
  const calendarCoverage = calendar.length > 0 ? 100 : 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Data Quality Report</span>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="quality-section">
            <div className="quality-section-title">Overview</div>
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-card-value">{feedStats.routeCount}</div>
                <div className="stat-card-label">Routes</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">{feedStats.stopCount.toLocaleString()}</div>
                <div className="stat-card-label">Stops</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">{feedStats.tripCount.toLocaleString()}</div>
                <div className="stat-card-label">Trips</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">{new Set(shapes.map(s => s.shape_id)).size}</div>
                <div className="stat-card-label">Shapes</div>
              </div>
            </div>
          </div>

          <div className="quality-section">
            <div className="quality-section-title">Completeness</div>
            <div className="quality-bars">
              <QualityBar label="Shape coverage" value={shapesCoverage} />
              <QualityBar label="Stop coordinates" value={stopsCoordsCoverage} />
              <QualityBar label="Trip schedules" value={tripsCoverage} />
              <QualityBar label="Stop names" value={namesCoverage} />
              <QualityBar label="Route colors" value={colorsCoverage} />
              <QualityBar label="Service calendar" value={calendarCoverage} />
            </div>
          </div>

          <div className="quality-section">
            <div className="quality-section-title">GTFS Files</div>
            <div className="files-row">
              <FileBadge label="stops.txt" present={stops.length > 0} />
              <FileBadge label="routes.txt" present={routes.length > 0} />
              <FileBadge label="trips.txt" present={trips.length > 0} />
              <FileBadge label="stop_times.txt" present={stopTimes.length > 0} />
              <FileBadge label="shapes.txt" present={shapes.length > 0} />
              <FileBadge label="calendar.txt" present={calendar.length > 0} />
              <FileBadge label="frequencies.txt" present={frequencies.length > 0} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function QualityBar({ label, value }: { label: string; value: number }) {
  const getClass = (v: number) => {
    if (v >= 80) return 'good'
    if (v >= 50) return 'warn'
    return 'bad'
  }

  return (
    <div className="quality-bar">
      <span className="quality-bar-label">{label}</span>
      <div className="quality-bar-track">
        <div className={`quality-bar-fill ${getClass(value)}`} style={{ width: `${value}%` }} />
      </div>
      <span className={`quality-bar-value ${getClass(value)}`}>{value}%</span>
    </div>
  )
}

function FileBadge({ label, present }: { label: string; present: boolean }) {
  return (
    <div className={`file-badge ${present ? 'present' : 'missing'}`}>
      {present ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      <span>{label}</span>
    </div>
  )
}

// Mini Calendar Component
function MiniCalendar({ selectedDate, onSelectDate, calendar }: {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  calendar: GtfsCalendar[]
}) {
  const today = new Date()
  const dayNames = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

  // Get week days around selected date (3 days before, selected, 3 days after)
  const getWeekDays = () => {
    const days: Date[] = []
    for (let i = -3; i <= 3; i++) {
      const d = new Date(selectedDate)
      d.setDate(selectedDate.getDate() + i)
      days.push(d)
    }
    return days
  }

  // Check if a date has service based on calendar
  const hasService = (date: Date) => {
    if (calendar.length === 0) return true // If no calendar, assume all days have service

    const dayOfWeek = date.getDay()
    const dayFields = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')

    return calendar.some(cal => {
      const inRange = dateStr >= cal.start_date && dateStr <= cal.end_date
      const dayActive = cal[dayFields[dayOfWeek]] === 1
      return inRange && dayActive
    })
  }

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString()
  }

  const weekDays = getWeekDays()

  return (
    <div className="mini-calendar">
      <div className="mini-calendar-days">
        {weekDays.map((date, i) => {
          const service = hasService(date)
          return (
            <button
              key={i}
              onClick={() => onSelectDate(date)}
              className={`mini-calendar-day ${isSelected(date) ? 'selected' : ''} ${isToday(date) ? 'today' : ''} ${!service ? 'no-service' : ''}`}
            >
              <span className="day-name">{dayNames[date.getDay()]}</span>
              <span className="day-number">{date.getDate()}</span>
              {service && <span className="day-dot" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default Layout
