import { useMemo, useState } from 'react'
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

  const [isExpanded, setIsExpanded] = useState(true)

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
      const longName = String(route.route_long_name ?? '').toLowerCase()
      const routeId = String(route.route_id).toLowerCase()

      const matchesSearch =
        !searchQuery ||
        shortName.includes(query) ||
        longName.includes(query) ||
        routeId.includes(query)

      const matchesType =
        selectedRouteTypes.size === 0 || selectedRouteTypes.has(route.route_type)

      return matchesSearch && matchesType
    })
  }, [routes, searchQuery, selectedRouteTypes])

  if (routes.length === 0) return null

  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
      >
        <h3 className="font-semibold text-sm text-gray-700">
          Routes ({routes.length})
        </h3>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Search routes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Route type filters */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Filter by type</span>
              {selectedRouteTypes.size > 0 && (
                <button
                  onClick={clearRouteTypeFilter}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {availableRouteTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleRouteType(type)}
                  className={`px-2 py-1 text-xs rounded-full transition-colors ${
                    selectedRouteTypes.has(type)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {ROUTE_TYPES[type] || `Type ${type}`}
                </button>
              ))}
            </div>
          </div>

          {/* Selected routes indicator */}
          {selectedRouteIds.size > 0 && (
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="text-gray-500">{selectedRouteIds.size} selected</span>
              <button
                onClick={clearRouteSelection}
                className="text-blue-600 hover:text-blue-800"
              >
                Clear selection
              </button>
            </div>
          )}

          {/* Route list */}
          <div className="max-h-96 overflow-y-auto space-y-1">
            {filteredRoutes.map((route) => {
              const colorStr = String(route.route_color ?? '')
              const color = colorStr
                ? colorStr.startsWith('#')
                  ? colorStr
                  : `#${colorStr}`
                : '#3388ff'
              const isSelected = selectedRouteIds.has(route.route_id)
              const stats = routeStats.get(route.route_id)

              return (
                <button
                  key={route.route_id}
                  onClick={() => toggleRouteSelection(route.route_id)}
                  className={`w-full p-2 rounded text-left text-sm transition-colors ${
                    isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-800 truncate">
                        {route.route_short_name || route.route_id}
                      </div>
                      {route.route_long_name && (
                        <div className="text-xs text-gray-500 truncate">
                          {route.route_long_name}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {ROUTE_TYPES[route.route_type] || route.route_type}
                    </span>
                  </div>

                  {/* Route stats */}
                  {stats && stats.tripCount > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                      <span title="Number of stops">
                        {stats.stopCount} stops
                      </span>
                      {stats.distanceKm > 0 && (
                        <span title="Route distance">
                          {stats.distanceKm.toFixed(1)} km
                        </span>
                      )}
                      {stats.durationMinutes > 0 && (
                        <span title="Trip duration">
                          {Math.round(stats.durationMinutes)} min
                        </span>
                      )}
                      {stats.avgSpeedKmh > 0 && (
                        <span title="Average speed">
                          {stats.avgSpeedKmh.toFixed(0)} km/h
                        </span>
                      )}
                      {stats.headwayMinutes && (
                        <span title="Frequency" className="text-green-600">
                          c/{Math.round(stats.headwayMinutes)} min
                        </span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default RouteList
