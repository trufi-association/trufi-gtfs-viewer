import type { GtfsStopTime, GtfsTrip, GtfsStop, GtfsRoute, VehiclePosition } from '../../types/gtfs'

// Parse GTFS time string (HH:MM:SS) to seconds since midnight
export function parseGtfsTime(timeStr: string): number {
  const parts = timeStr.split(':').map(Number)
  return parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0)
}

// Format seconds to HH:MM:SS
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Get active trips at a given time
export function getActiveTrips(
  stopTimes: GtfsStopTime[],
  _trips: GtfsTrip[],
  currentTimeSeconds: number
): Map<string, { startTime: number; endTime: number; stopTimes: GtfsStopTime[] }> {
  // Group stop times by trip_id
  const tripStopTimes = new Map<string, GtfsStopTime[]>()
  for (const st of stopTimes) {
    const existing = tripStopTimes.get(st.trip_id) || []
    existing.push(st)
    tripStopTimes.set(st.trip_id, existing)
  }

  // Sort stop times by sequence and find active trips
  const activeTrips = new Map<string, { startTime: number; endTime: number; stopTimes: GtfsStopTime[] }>()

  for (const [tripId, times] of tripStopTimes) {
    times.sort((a, b) => a.stop_sequence - b.stop_sequence)

    const startTime = parseGtfsTime(times[0].departure_time)
    const endTime = parseGtfsTime(times[times.length - 1].arrival_time)

    // Check if trip is active at current time
    if (currentTimeSeconds >= startTime && currentTimeSeconds <= endTime) {
      activeTrips.set(tripId, { startTime, endTime, stopTimes: times })
    }
  }

  return activeTrips
}

// Interpolate vehicle position along a trip
export function interpolateVehiclePosition(
  _tripId: string,
  tripStopTimes: GtfsStopTime[],
  stops: Map<string, GtfsStop>,
  currentTimeSeconds: number
): { position: [number, number]; bearing: number; nextStopId: string; progress: number } | null {
  // Find the two stops between which the vehicle currently is
  let prevStop: GtfsStopTime | null = null
  let nextStop: GtfsStopTime | null = null

  for (let i = 0; i < tripStopTimes.length; i++) {
    const st = tripStopTimes[i]
    const departureTime = parseGtfsTime(st.departure_time)
    const arrivalTime = parseGtfsTime(st.arrival_time)

    if (currentTimeSeconds < arrivalTime) {
      nextStop = st
      prevStop = i > 0 ? tripStopTimes[i - 1] : null
      break
    }

    // Vehicle is at this stop (between arrival and departure)
    if (currentTimeSeconds >= arrivalTime && currentTimeSeconds <= departureTime) {
      const stop = stops.get(st.stop_id)
      if (stop) {
        return {
          position: [stop.stop_lon, stop.stop_lat],
          bearing: 0,
          nextStopId: st.stop_id,
          progress: 0,
        }
      }
    }
  }

  if (!prevStop || !nextStop) return null

  const prevStopData = stops.get(prevStop.stop_id)
  const nextStopData = stops.get(nextStop.stop_id)

  if (!prevStopData || !nextStopData) return null

  // Calculate interpolation factor
  const prevDeparture = parseGtfsTime(prevStop.departure_time)
  const nextArrival = parseGtfsTime(nextStop.arrival_time)
  const totalTime = nextArrival - prevDeparture
  const elapsed = currentTimeSeconds - prevDeparture
  const t = totalTime > 0 ? Math.min(1, Math.max(0, elapsed / totalTime)) : 0

  // Linear interpolation
  const lon = prevStopData.stop_lon + t * (nextStopData.stop_lon - prevStopData.stop_lon)
  const lat = prevStopData.stop_lat + t * (nextStopData.stop_lat - prevStopData.stop_lat)

  // Calculate bearing
  const bearing = calculateBearing(
    prevStopData.stop_lat,
    prevStopData.stop_lon,
    nextStopData.stop_lat,
    nextStopData.stop_lon
  )

  return {
    position: [lon, lat],
    bearing,
    nextStopId: nextStop.stop_id,
    progress: t,
  }
}

// Calculate bearing between two points
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const lat1Rad = (lat1 * Math.PI) / 180
  const lat2Rad = (lat2 * Math.PI) / 180

  const y = Math.sin(dLon) * Math.cos(lat2Rad)
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon)

  const bearing = (Math.atan2(y, x) * 180) / Math.PI
  return (bearing + 360) % 360
}

// Get all vehicle positions at current time
export function getVehiclePositions(
  stopTimes: GtfsStopTime[],
  trips: GtfsTrip[],
  routes: GtfsRoute[],
  stops: GtfsStop[],
  currentTimeSeconds: number
): VehiclePosition[] {
  const activeTrips = getActiveTrips(stopTimes, trips, currentTimeSeconds)
  const stopsMap = new Map(stops.map((s) => [s.stop_id, s]))
  const tripsMap = new Map(trips.map((t) => [t.trip_id, t]))
  const routesMap = new Map(routes.map((r) => [r.route_id, r]))

  const positions: VehiclePosition[] = []

  for (const [tripId, tripData] of activeTrips) {
    const interpolated = interpolateVehiclePosition(
      tripId,
      tripData.stopTimes,
      stopsMap,
      currentTimeSeconds
    )

    if (interpolated) {
      const trip = tripsMap.get(tripId)
      const route = trip ? routesMap.get(trip.route_id) : undefined

      let color = '#3388ff'
      if (route?.route_color) {
        const colorStr = String(route.route_color)
        color = colorStr.startsWith('#') ? colorStr : `#${colorStr}`
      }

      positions.push({
        tripId,
        routeId: trip?.route_id || '',
        position: interpolated.position,
        bearing: interpolated.bearing,
        nextStopId: interpolated.nextStopId,
        progress: interpolated.progress,
        color,
        headsign: trip?.trip_headsign,
      })
    }
  }

  return positions
}
