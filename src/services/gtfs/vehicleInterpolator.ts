import type { GtfsStopTime, GtfsTrip, GtfsStop, GtfsRoute, GtfsFrequency, VehiclePosition } from '../../types/gtfs'

// Parse GTFS time string (HH:MM:SS) to seconds since midnight
// Also handles cases where PapaParse converts times to numbers (e.g., "8:30:00" -> 83000)
export function parseGtfsTime(timeStr: string | number | undefined | null): number {
  if (timeStr === undefined || timeStr === null) return -1

  // If it's already a number, it might be parsed incorrectly by PapaParse
  // e.g., "8:30:00" could become 83000 or similar
  if (typeof timeStr === 'number') {
    // Check if it looks like a concatenated time (e.g., 83000 for 8:30:00)
    const str = String(timeStr).padStart(6, '0')
    if (str.length >= 4) {
      // Try to parse as HHMMSS or HMMSS
      let hours: number, minutes: number, seconds: number
      if (str.length <= 4) {
        // Format: HHMM or HMM
        hours = parseInt(str.slice(0, -2), 10)
        minutes = parseInt(str.slice(-2), 10)
        seconds = 0
      } else {
        // Format: HHMMSS or HMMSS
        seconds = parseInt(str.slice(-2), 10)
        minutes = parseInt(str.slice(-4, -2), 10)
        hours = parseInt(str.slice(0, -4), 10)
      }
      if (!isNaN(hours) && !isNaN(minutes) && !isNaN(seconds) &&
          hours >= 0 && hours < 48 && minutes >= 0 && minutes < 60 && seconds >= 0 && seconds < 60) {
        return hours * 3600 + minutes * 60 + seconds
      }
    }
    return -1
  }

  // Handle string format
  if (typeof timeStr !== 'string') return -1
  const parts = timeStr.split(':').map(Number)
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return -1
  return parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0)
}

// Format seconds to HH:MM:SS
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Represents an active vehicle instance (could be from frequency or regular schedule)
interface ActiveVehicle {
  tripId: string
  instanceId: string // Unique ID for this vehicle instance
  tripStartTime: number // When this specific trip instance started
  tripDuration: number // How long the trip takes
  stopTimes: GtfsStopTime[]
}

// Get active vehicles at a given time (handles both frequency-based and regular trips)
export function getActiveVehicles(
  stopTimes: GtfsStopTime[],
  frequencies: GtfsFrequency[],
  currentTimeSeconds: number
): ActiveVehicle[] {
  // Group stop times by trip_id
  const tripStopTimes = new Map<string, GtfsStopTime[]>()
  for (const st of stopTimes) {
    const existing = tripStopTimes.get(st.trip_id) || []
    existing.push(st)
    tripStopTimes.set(st.trip_id, existing)
  }

  // Sort stop times by sequence and calculate trip durations
  const tripDurations = new Map<string, { duration: number; stopTimes: GtfsStopTime[] }>()
  for (const [tripId, times] of tripStopTimes) {
    times.sort((a, b) => a.stop_sequence - b.stop_sequence)
    const firstTime = parseGtfsTime(times[0].departure_time)
    const lastTime = parseGtfsTime(times[times.length - 1].arrival_time)
    if (firstTime >= 0 && lastTime >= 0) {
      tripDurations.set(tripId, { duration: lastTime - firstTime, stopTimes: times })
    }
  }

  const activeVehicles: ActiveVehicle[] = []

  // Check if we have frequencies (frequency-based GTFS)
  if (frequencies.length > 0) {
    // Group frequencies by trip_id
    const tripFrequencies = new Map<string, GtfsFrequency[]>()
    for (const freq of frequencies) {
      const existing = tripFrequencies.get(freq.trip_id) || []
      existing.push(freq)
      tripFrequencies.set(freq.trip_id, existing)
    }

    // For each trip with frequencies, generate vehicle instances
    for (const [tripId, freqs] of tripFrequencies) {
      const tripData = tripDurations.get(tripId)
      if (!tripData) continue

      for (const freq of freqs) {
        const freqStart = parseGtfsTime(freq.start_time)
        const freqEnd = parseGtfsTime(freq.end_time)
        const headway = freq.headway_secs

        if (freqStart < 0 || freqEnd < 0 || headway <= 0) continue

        // Generate vehicle instances based on headway
        let departureTime = freqStart
        let instanceNum = 0
        while (departureTime < freqEnd) {
          const tripEndTime = departureTime + tripData.duration

          // Check if this instance is active at current time
          if (currentTimeSeconds >= departureTime && currentTimeSeconds <= tripEndTime) {
            activeVehicles.push({
              tripId,
              instanceId: `${tripId}_${instanceNum}`,
              tripStartTime: departureTime,
              tripDuration: tripData.duration,
              stopTimes: tripData.stopTimes,
            })
          }

          departureTime += headway
          instanceNum++
        }
      }
    }
  } else {
    // Regular schedule-based GTFS (no frequencies)
    for (const [tripId, tripData] of tripDurations) {
      const firstTime = parseGtfsTime(tripData.stopTimes[0].departure_time)
      const lastTime = parseGtfsTime(tripData.stopTimes[tripData.stopTimes.length - 1].arrival_time)

      if (currentTimeSeconds >= firstTime && currentTimeSeconds <= lastTime) {
        activeVehicles.push({
          tripId,
          instanceId: tripId,
          tripStartTime: firstTime,
          tripDuration: tripData.duration,
          stopTimes: tripData.stopTimes,
        })
      }
    }
  }

  return activeVehicles
}

// Interpolate vehicle position along a trip
// elapsedTime is how many seconds have passed since this trip instance started
export function interpolateVehiclePosition(
  tripStopTimes: GtfsStopTime[],
  stops: Map<string, GtfsStop>,
  elapsedTime: number
): { position: [number, number]; bearing: number; nextStopId: string; progress: number } | null {
  // Find the two stops between which the vehicle currently is
  let prevStop: GtfsStopTime | null = null
  let nextStop: GtfsStopTime | null = null

  for (let i = 0; i < tripStopTimes.length; i++) {
    const st = tripStopTimes[i]
    // Times in stop_times are relative to trip start for frequency-based trips
    const departureTime = parseGtfsTime(st.departure_time)
    const arrivalTime = parseGtfsTime(st.arrival_time)

    // Skip invalid times
    if (arrivalTime < 0 || departureTime < 0) continue

    if (elapsedTime < arrivalTime) {
      nextStop = st
      prevStop = i > 0 ? tripStopTimes[i - 1] : null
      break
    }

    // Vehicle is at this stop (between arrival and departure)
    if (elapsedTime >= arrivalTime && elapsedTime <= departureTime) {
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
  const elapsed = elapsedTime - prevDeparture
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
  frequencies: GtfsFrequency[],
  currentTimeSeconds: number
): VehiclePosition[] {
  const activeVehicles = getActiveVehicles(stopTimes, frequencies, currentTimeSeconds)
  const stopsMap = new Map(stops.map((s) => [s.stop_id, s]))
  const tripsMap = new Map(trips.map((t) => [t.trip_id, t]))
  const routesMap = new Map(routes.map((r) => [r.route_id, r]))

  const positions: VehiclePosition[] = []

  for (const vehicle of activeVehicles) {
    // Calculate elapsed time since this trip instance started
    const elapsedTime = currentTimeSeconds - vehicle.tripStartTime

    const interpolated = interpolateVehiclePosition(
      vehicle.stopTimes,
      stopsMap,
      elapsedTime
    )

    if (interpolated) {
      const trip = tripsMap.get(vehicle.tripId)
      const route = trip ? routesMap.get(trip.route_id) : undefined

      let color = '#3388ff'
      if (route?.route_color) {
        const colorStr = String(route.route_color)
        color = colorStr.startsWith('#') ? colorStr : `#${colorStr}`
      }

      positions.push({
        tripId: vehicle.instanceId, // Use instance ID to make each vehicle unique
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
