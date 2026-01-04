import { useState, useMemo } from 'react'
import Map from './map/Map'
import { useGtfsStore } from '../store/gtfsStore'
import { useTimetableStore } from '../store/timetableStore'
import { useUiStore } from '../store/uiStore'
import { formatTime, parseGtfsTime } from '../services/gtfs/vehicleInterpolator'
import { ROUTE_TYPES } from '../types/gtfs'
import type { GtfsRoute, GtfsTrip, GtfsStopTime, GtfsShape, GtfsStop, GtfsCalendar, GtfsFrequency } from '../types/gtfs'
import DropZone from './upload/DropZone'

// Haversine distance formula
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function Layout() {
  const [qualityModalOpen, setQualityModalOpen] = useState(false)

  const { feedStats, routes, trips, stopTimes, shapes, stops, calendar, frequencies, clearData } = useGtfsStore()
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
    layerVisibility,
    setLayerVisibility,
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

  // Calculate route stats with distance, duration, speed, headway
  const routeStats = useMemo(() => {
    const stats: Record<string, {
      tripCount: number
      stopCount: number
      distanceKm: number
      durationMinutes: number
      speedKmh: number
      headwayMinutes: number | null
    }> = {}
    const stopsLookup: Record<string, typeof stops[0]> = {}
    for (const s of stops) stopsLookup[s.stop_id] = s

    for (const route of routes) {
      const routeTrips = trips.filter(t => t.route_id === route.route_id)

      if (routeTrips.length === 0) {
        stats[route.route_id] = { tripCount: 0, stopCount: 0, distanceKm: 0, durationMinutes: 0, speedKmh: 0, headwayMinutes: null }
        continue
      }

      const firstTrip = routeTrips[0]
      const tripStopTimes = stopTimes.filter(st => st.trip_id === firstTrip.trip_id).sort((a, b) => a.stop_sequence - b.stop_sequence)

      // Count unique stops
      const routeStopIds = new Set<string>()
      for (const trip of routeTrips) {
        const tripSts = stopTimes.filter(st => st.trip_id === trip.trip_id)
        for (const st of tripSts) routeStopIds.add(st.stop_id)
      }

      // Calculate distance from shape or stops
      let distanceKm = 0
      if (firstTrip.shape_id) {
        const shapePoints = shapes.filter(s => s.shape_id === firstTrip.shape_id).sort((a, b) => a.shape_pt_sequence - b.shape_pt_sequence)
        for (let i = 1; i < shapePoints.length; i++) {
          distanceKm += haversineDistance(shapePoints[i - 1].shape_pt_lat, shapePoints[i - 1].shape_pt_lon, shapePoints[i].shape_pt_lat, shapePoints[i].shape_pt_lon)
        }
      } else if (tripStopTimes.length > 1) {
        for (let i = 1; i < tripStopTimes.length; i++) {
          const prevStop = stopsLookup[tripStopTimes[i - 1].stop_id]
          const currStop = stopsLookup[tripStopTimes[i].stop_id]
          if (prevStop && currStop) {
            distanceKm += haversineDistance(prevStop.stop_lat, prevStop.stop_lon, currStop.stop_lat, currStop.stop_lon)
          }
        }
      }

      // Calculate duration
      let durationMinutes = 0
      if (tripStopTimes.length >= 2) {
        const firstTime = parseGtfsTime(tripStopTimes[0].departure_time)
        const lastTime = parseGtfsTime(tripStopTimes[tripStopTimes.length - 1].arrival_time)
        if (firstTime >= 0 && lastTime >= 0) durationMinutes = (lastTime - firstTime) / 60
      }

      // Calculate average speed
      const speedKmh = durationMinutes > 0 ? (distanceKm / (durationMinutes / 60)) : 0

      // Get headway from frequencies
      let headwayMinutes: number | null = null
      const routeFreqs = frequencies.filter(f => routeTrips.some(t => t.trip_id === f.trip_id))
      if (routeFreqs.length > 0) headwayMinutes = routeFreqs[0].headway_secs / 60

      stats[route.route_id] = { tripCount: routeTrips.length, stopCount: routeStopIds.size, distanceKm, durationMinutes, speedKmh, headwayMinutes }
    }

    return stats
  }, [routes, trips, stopTimes, stops, shapes, frequencies])

  const progressPercent = (currentTimeSeconds / 86400) * 100
  const speeds = [1, 2, 5, 10, 30, 60]

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
            <button className="clear-data-header" onClick={clearData} title="Close and load another file">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
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
                {stats && stats.tripCount > 0 && (
                  <div className="route-card-metrics">
                    <div className="route-metric">
                      <span className="metric-value">{stats.tripCount}</span>
                      <span className="metric-label">trips</span>
                    </div>
                    <div className="route-metric">
                      <span className="metric-value">{stats.stopCount}</span>
                      <span className="metric-label">stops</span>
                    </div>
                    {stats.distanceKm > 0 && (
                      <div className="route-metric">
                        <span className="metric-value">{stats.distanceKm.toFixed(1)}</span>
                        <span className="metric-label">km</span>
                      </div>
                    )}
                    {stats.durationMinutes > 0 && (
                      <div className="route-metric">
                        <span className="metric-value">{Math.round(stats.durationMinutes)}</span>
                        <span className="metric-label">min</span>
                      </div>
                    )}
                    {stats.speedKmh > 0 && (
                      <div className="route-metric highlight">
                        <span className="metric-value">{Math.round(stats.speedKmh)}</span>
                        <span className="metric-label">km/h</span>
                      </div>
                    )}
                    {stats.headwayMinutes && (
                      <div className="route-metric frequency">
                        <span className="metric-value">c/{Math.round(stats.headwayMinutes)}</span>
                        <span className="metric-label">min</span>
                      </div>
                    )}
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

        {/* Floating Vehicles Chip */}
        <div className="floating-vehicles-chip">
          <span className="chip-dot" />
          <span className="chip-count">{filteredVehicleCount}</span>
          <span className="chip-label">vehicles</span>
        </div>

        {/* Floating Layers Control */}
        <div className="floating-layers">
          <div className="layers-dropdown">
            <button className="layers-toggle" title="Map layers">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </button>
            <div className="layers-menu">
              <div className="layers-menu-title">Map layers</div>
              <label className="layer-checkbox">
                <input
                  type="checkbox"
                  checked={layerVisibility.vehicles}
                  onChange={() => setLayerVisibility('vehicles', !layerVisibility.vehicles)}
                />
                <span className="checkbox-label">Vehicles</span>
              </label>
              <label className="layer-checkbox">
                <input
                  type="checkbox"
                  checked={layerVisibility.shapes}
                  onChange={() => setLayerVisibility('shapes', !layerVisibility.shapes)}
                />
                <span className="checkbox-label">Routes</span>
              </label>
              <label className="layer-checkbox">
                <input
                  type="checkbox"
                  checked={layerVisibility.stops}
                  onChange={() => setLayerVisibility('stops', !layerVisibility.stops)}
                />
                <span className="checkbox-label">Stops</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Panel */}
      <div className="timeline-panel">
        {/* Left section: Play + Speed + Time + Vehicles */}
        <div className="panel-left">
          <div className="play-speed-stack">
            <button className="play-btn" onClick={togglePlayback}>
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
            <div className="speed-controls-compact">
              {speeds.map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`speed-btn-compact ${playbackSpeed === speed ? 'active' : ''}`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          <div className="time-display">
            <span className="time-current">{formatTime(Math.floor(currentTimeSeconds))}</span>
          </div>
        </div>

        {/* Center: Timeline slider */}
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

        {/* Right section: Date Picker */}
        <div className="panel-right">
          <div className="date-picker-wrapper">
            <button className="date-picker-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="date-picker-text">
                <span className="date-picker-weekday">
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className="date-picker-date">
                  {selectedDate.toLocaleDateString('en-US', { month: 'short' })} {selectedDate.getDate()}, {selectedDate.getFullYear()}
                </span>
              </span>
              <svg className="date-picker-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div className="date-picker-dropdown">
              {/* Date Controls */}
              <div className="date-picker-controls">
                {/* Year */}
                <div className="date-control-group">
                  <span className="date-control-label">Year</span>
                  <div className="date-control-row">
                    <button
                      className="date-control-btn"
                      onClick={() => {
                        const d = new Date(selectedDate)
                        d.setFullYear(d.getFullYear() - 1)
                        setSelectedDate(d)
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="date-control-value">{selectedDate.getFullYear()}</span>
                    <button
                      className="date-control-btn"
                      onClick={() => {
                        const d = new Date(selectedDate)
                        d.setFullYear(d.getFullYear() + 1)
                        setSelectedDate(d)
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Month */}
                <div className="date-control-group">
                  <span className="date-control-label">Month</span>
                  <div className="date-control-row">
                    <button
                      className="date-control-btn"
                      onClick={() => {
                        const d = new Date(selectedDate)
                        d.setMonth(d.getMonth() - 1)
                        setSelectedDate(d)
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="date-control-value">{selectedDate.toLocaleDateString('en-US', { month: 'short' })}</span>
                    <button
                      className="date-control-btn"
                      onClick={() => {
                        const d = new Date(selectedDate)
                        d.setMonth(d.getMonth() + 1)
                        setSelectedDate(d)
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Day */}
                <div className="date-control-group">
                  <span className="date-control-label">Day</span>
                  <div className="date-control-row">
                    <button className="date-control-btn" onClick={prevDay}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="date-control-value date-control-day">
                      {selectedDate.getDate()}
                      <span className="date-control-weekday">
                        {selectedDate.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                    </span>
                    <button className="date-control-btn" onClick={nextDay}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="date-picker-quick">
                <button
                  className="date-quick-btn"
                  onClick={() => setSelectedDate(new Date())}
                >
                  Today
                </button>
                {calendar.length > 0 && (() => {
                  const dates = calendar.map(c => c.start_date).sort()
                  const start = dates[0]
                  if (start) {
                    const startDate = new Date(
                      parseInt(start.slice(0, 4)),
                      parseInt(start.slice(4, 6)) - 1,
                      parseInt(start.slice(6, 8))
                    )
                    return (
                      <button
                        className="date-quick-btn"
                        onClick={() => setSelectedDate(startDate)}
                      >
                        GTFS Start
                      </button>
                    )
                  }
                  return null
                })()}
              </div>

              {/* Active Services for Selected Date */}
              {calendar.length > 0 && (() => {
                const dayOfWeek = selectedDate.getDay()
                const dayFields = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
                const dateStr = `${selectedDate.getFullYear()}${String(selectedDate.getMonth() + 1).padStart(2, '0')}${String(selectedDate.getDate()).padStart(2, '0')}`

                const activeServices = calendar.filter(cal => {
                  const inRange = dateStr >= cal.start_date && dateStr <= cal.end_date
                  const dayActive = cal[dayFields[dayOfWeek]] === 1
                  return inRange && dayActive
                })

                const inactiveServices = calendar.filter(cal => !activeServices.includes(cal))

                // Count trips per service
                const tripsPerService: Record<string, number> = {}
                trips.forEach(t => {
                  tripsPerService[t.service_id] = (tripsPerService[t.service_id] || 0) + 1
                })

                return (
                  <div className="date-picker-services">
                    <div className="services-header">
                      <span className="services-title">Active services</span>
                      <span className={`services-count ${activeServices.length > 0 ? 'active' : 'none'}`}>
                        {activeServices.length}/{calendar.length}
                      </span>
                    </div>

                    {activeServices.length === 0 ? (
                      <div className="services-empty">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>No service on this date</span>
                      </div>
                    ) : (
                      <div className="services-list">
                        {activeServices.slice(0, 4).map((cal, i) => {
                          const tripCount = tripsPerService[cal.service_id] || 0
                          return (
                            <div key={i} className="service-item active">
                              <div className="service-item-header">
                                <span className="service-item-dot" />
                                <span className="service-item-name">{cal.service_id}</span>
                              </div>
                              <span className="service-item-trips">{tripCount} trips</span>
                            </div>
                          )
                        })}
                        {activeServices.length > 4 && (
                          <div className="services-more">+{activeServices.length - 4} more</div>
                        )}
                      </div>
                    )}

                    {inactiveServices.length > 0 && activeServices.length > 0 && (
                      <div className="services-inactive">
                        <span className="inactive-label">Inactive today:</span>
                        <span className="inactive-list">
                          {inactiveServices.slice(0, 3).map(s => s.service_id).join(', ')}
                          {inactiveServices.length > 3 && ` +${inactiveServices.length - 3}`}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })()}

              <div className="date-picker-divider" />

              {/* Feed Summary */}
              <div className="date-picker-summary">
                <div className="summary-row">
                  <span>{routes.length} routes</span>
                  <span>•</span>
                  <span>{stops.length.toLocaleString()} stops</span>
                </div>
                {calendar.length > 0 && (
                  <div className="summary-validity">
                    {(() => {
                      const startDates = calendar.map(c => c.start_date).sort()
                      const endDates = calendar.map(c => c.end_date).sort()
                      const start = startDates[0]
                      const end = endDates[endDates.length - 1]
                      const formatDate = (d: string) => `${d.slice(4, 6)}/${d.slice(6, 8)}/${d.slice(0, 4)}`
                      return start && end ? `Valid: ${formatDate(start)} - ${formatDate(end)}` : ''
                    })()}
                  </div>
                )}
              </div>

              {selectedRouteIds.size > 0 && (
                <>
                  <div className="date-picker-divider" />
                  <div className="date-picker-selection">
                    <span className="selection-label">
                      <span className="selection-dot" />
                      {selectedRouteIds.size} route{selectedRouteIds.size > 1 ? 's' : ''} selected
                    </span>
                  </div>
                </>
              )}
            </div>
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

export default Layout
