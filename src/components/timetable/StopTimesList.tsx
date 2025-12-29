import { useMemo } from 'react'
import { useGtfsStore } from '../../store/gtfsStore'
import { useUiStore } from '../../store/uiStore'
import { useTimetableStore } from '../../store/timetableStore'
import { parseGtfsTime } from '../../services/gtfs/vehicleInterpolator'
import { ROUTE_TYPES } from '../../types/gtfs'

export function StopTimesList() {
  const { stopTimes, trips, routes, stops } = useGtfsStore()
  const { selectedStopId, setSelectedStop } = useUiStore()
  const { currentTimeSeconds } = useTimetableStore()

  // Get stop times for selected stop
  const stopSchedule = useMemo(() => {
    if (!selectedStopId) return []

    const tripMap = new Map(trips.map((t) => [t.trip_id, t]))
    const routeMap = new Map(routes.map((r) => [r.route_id, r]))

    return stopTimes
      .filter((st) => st.stop_id === selectedStopId)
      .map((st) => {
        const trip = tripMap.get(st.trip_id)
        const route = trip ? routeMap.get(trip.route_id) : undefined
        const arrivalSeconds = parseGtfsTime(st.arrival_time)

        return {
          ...st,
          trip,
          route,
          arrivalSeconds,
          color: route?.route_color
            ? route.route_color.startsWith('#')
              ? route.route_color
              : `#${route.route_color}`
            : '#3388ff',
        }
      })
      .sort((a, b) => a.arrivalSeconds - b.arrivalSeconds)
  }, [selectedStopId, stopTimes, trips, routes])

  // Find the selected stop info
  const selectedStop = useMemo(() => {
    if (!selectedStopId) return null
    return stops.find((s) => s.stop_id === selectedStopId)
  }, [selectedStopId, stops])

  // Find next arrivals from current time
  const nextArrivals = useMemo(() => {
    return stopSchedule.filter((st) => st.arrivalSeconds >= currentTimeSeconds).slice(0, 10)
  }, [stopSchedule, currentTimeSeconds])

  if (!selectedStopId) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        Click on a stop to view its timetable
      </div>
    )
  }

  return (
    <div className="border-t border-gray-200">
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800">{selectedStop?.stop_name}</h3>
            <p className="text-xs text-gray-500">
              {stopSchedule.length} arrivals/departures
            </p>
          </div>
          <button
            onClick={() => setSelectedStop(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {nextArrivals.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No more arrivals today
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {nextArrivals.map((st) => (
              <div
                key={`${st.trip_id}-${st.stop_sequence}`}
                className="p-3 hover:bg-gray-50 flex items-center gap-3"
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: st.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-800">
                    {st.route?.route_short_name || st.route?.route_id || 'Unknown'}
                    {st.trip?.trip_headsign && (
                      <span className="font-normal text-gray-500 ml-2">
                        → {st.trip.trip_headsign}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {st.route?.route_type !== undefined && (
                      <span>{ROUTE_TYPES[st.route.route_type] || `Type ${st.route.route_type}`}</span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-mono text-sm font-semibold text-gray-800">
                    {st.arrival_time.slice(0, 5)}
                  </div>
                  {st.departure_time !== st.arrival_time && (
                    <div className="font-mono text-xs text-gray-400">
                      dep {st.departure_time.slice(0, 5)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default StopTimesList
