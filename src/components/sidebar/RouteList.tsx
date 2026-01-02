import { useMemo } from 'react'
import { useGtfsStore } from '../../store/gtfsStore'
import { useUiStore } from '../../store/uiStore'
import { ROUTE_TYPES } from '../../types/gtfs'
import { parseGtfsTime } from '../../services/gtfs/vehicleInterpolator'

// Calculate distance between two points in km using Haversine formula
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

interface RouteStats {
  tripCount: number
  stopCount: number
  distanceKm: number
  durationMinutes: number
  avgSpeedKmh: number
  headwayMinutes: number | null
}

export function RouteList() {
  const { routes, trips, stopTimes, stops, shapes, frequencies } = useGtfsStore()
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

  // Calculate stats for each route
  const routeStats = useMemo(() => {
    const stats = new Map<string, RouteStats>()
    const stopsMap = new Map(stops.map(s => [s.stop_id, s]))

    for (const route of routes) {
      // Get trips for this route
      const routeTrips = trips.filter(t => t.route_id === route.route_id)
      if (routeTrips.length === 0) {
        stats.set(route.route_id, {
          tripCount: 0,
          stopCount: 0,
          distanceKm: 0,
          durationMinutes: 0,
          avgSpeedKmh: 0,
          headwayMinutes: null,
        })
        continue
      }

      // Use first trip as representative
      const firstTrip = routeTrips[0]
      const tripStopTimes = stopTimes
        .filter(st => st.trip_id === firstTrip.trip_id)
        .sort((a, b) => a.stop_sequence - b.stop_sequence)

      // Calculate unique stops for this route
      const routeStopIds = new Set<string>()
      for (const trip of routeTrips) {
        const tripSts = stopTimes.filter(st => st.trip_id === trip.trip_id)
        for (const st of tripSts) {
          routeStopIds.add(st.stop_id)
        }
      }

      // Calculate distance from shape or stops
      let distanceKm = 0
      if (firstTrip.shape_id) {
        const shapePoints = shapes
          .filter(s => s.shape_id === firstTrip.shape_id)
          .sort((a, b) => a.shape_pt_sequence - b.shape_pt_sequence)

        for (let i = 1; i < shapePoints.length; i++) {
          distanceKm += haversineDistance(
            shapePoints[i - 1].shape_pt_lat,
            shapePoints[i - 1].shape_pt_lon,
            shapePoints[i].shape_pt_lat,
            shapePoints[i].shape_pt_lon
          )
        }
      } else if (tripStopTimes.length > 1) {
        // Fallback: calculate from stops
        for (let i = 1; i < tripStopTimes.length; i++) {
          const prevStop = stopsMap.get(tripStopTimes[i - 1].stop_id)
          const currStop = stopsMap.get(tripStopTimes[i].stop_id)
          if (prevStop && currStop) {
            distanceKm += haversineDistance(
              prevStop.stop_lat,
              prevStop.stop_lon,
              currStop.stop_lat,
              currStop.stop_lon
            )
          }
        }
      }

      // Calculate duration
      let durationMinutes = 0
      if (tripStopTimes.length >= 2) {
        const firstTime = parseGtfsTime(tripStopTimes[0].departure_time)
        const lastTime = parseGtfsTime(tripStopTimes[tripStopTimes.length - 1].arrival_time)
        if (firstTime >= 0 && lastTime >= 0) {
          durationMinutes = (lastTime - firstTime) / 60
        }
      }

      // Calculate average speed
      const avgSpeedKmh = durationMinutes > 0 ? (distanceKm / durationMinutes) * 60 : 0

      // Get headway from frequencies if available
      let headwayMinutes: number | null = null
      const routeFreqs = frequencies.filter(f =>
        routeTrips.some(t => t.trip_id === f.trip_id)
      )
      if (routeFreqs.length > 0) {
        headwayMinutes = routeFreqs[0].headway_secs / 60
      }

      stats.set(route.route_id, {
        tripCount: routeTrips.length,
        stopCount: routeStopIds.size,
        distanceKm,
        durationMinutes,
        avgSpeedKmh,
        headwayMinutes,
      })
    }

    return stats
  }, [routes, trips, stopTimes, stops, shapes, frequencies])

  // Get unique route types from data
  const availableRouteTypes = useMemo(() => {
    const types = new Set(routes.map((r) => r.route_type))
    return Array.from(types).sort((a, b) => a - b)
  }, [routes])

  // Filter routes based on search and route type
  const filteredRoutes = useMemo(() => {
    const query = searchQuery.toLowerCase()
    return routes.filter((route) => {
      const shortName = String(route.route_short_name ?? '').toLowerCase()

      const matchesSearch = !searchQuery || shortName.includes(query)

      const matchesType =
        selectedRouteTypes.size === 0 || selectedRouteTypes.has(route.route_type)

      return matchesSearch && matchesType
    })
  }, [routes, searchQuery, selectedRouteTypes])

  if (routes.length === 0) return null

  return (
    <div className="route-list">
      {/* Search */}
      <div className="route-list-header">
        <div className="input-with-icon">
          <svg
            className="input-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search routes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input"
          />
        </div>
      </div>

      {/* Filters section */}
      <div className="route-filters">
        <div className="filter-header">
          <span className="filter-label">Type</span>
          {selectedRouteTypes.size > 0 && (
            <button onClick={clearRouteTypeFilter} className="filter-clear">
              Clear
            </button>
          )}
        </div>
        <div className="filter-chips">
          {availableRouteTypes.map((type) => (
            <button
              key={type}
              onClick={() => toggleRouteType(type)}
              className={`chip ${selectedRouteTypes.has(type) ? 'chip-active' : 'chip-default'}`}
            >
              {ROUTE_TYPES[type] || `Type ${type}`}
            </button>
          ))}
        </div>
      </div>

      {/* Results header */}
      <div className="route-list-results">
        <span className="results-count">
          <strong>{filteredRoutes.length}</strong> of {routes.length} routes
        </span>
        {selectedRouteIds.size > 0 && (
          <button onClick={clearRouteSelection} className="results-clear">
            Deselect ({selectedRouteIds.size})
          </button>
        )}
      </div>

      {/* Route list */}
      <div className="route-list-items">
        {filteredRoutes.map((route) => {
          const colorStr = String(route.route_color ?? '')
          const color = colorStr
            ? colorStr.startsWith('#')
              ? colorStr
              : `#${colorStr}`
            : '#0891b2'
          const isSelected = selectedRouteIds.has(route.route_id)
          const stats = routeStats.get(route.route_id)

          return (
            <button
              key={route.route_id}
              onClick={() => toggleRouteSelection(route.route_id)}
              className={`route-item ${isSelected ? 'selected' : ''}`}
            >
              <div className="route-item-content">
                {/* Color indicator */}
                <span
                  className="route-color"
                  style={{ backgroundColor: color }}
                />

                <div className="route-info">
                  <div className="route-header">
                    <span className="route-name">
                      {route.route_short_name || route.route_id}
                    </span>
                    <span className="tag">
                      {ROUTE_TYPES[route.route_type] || route.route_type}
                    </span>
                  </div>

                  {route.route_long_name && (
                    <div className="route-long-name">
                      {route.route_long_name}
                    </div>
                  )}

                  {/* Stats row */}
                  {stats && stats.tripCount > 0 && (
                    <div className="route-stats">
                      <span className="route-stat">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {stats.stopCount}
                      </span>
                      {stats.distanceKm > 0 && (
                        <span className="route-stat">
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                          {stats.distanceKm.toFixed(1)} km
                        </span>
                      )}
                      {stats.durationMinutes > 0 && (
                        <span className="route-stat">
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {Math.round(stats.durationMinutes)} min
                        </span>
                      )}
                      {stats.headwayMinutes && (
                        <span className="route-stat highlight">
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          every {Math.round(stats.headwayMinutes)} min
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default RouteList
