import type { GtfsStopTime, GtfsTrip, GtfsStop, GtfsRoute, GtfsFrequency, VehiclePosition, TrajectoryCache, TimeIndexedVehicles } from '../../types/gtfs'
import { interpolateOnTrajectory } from './shapeInterpolator'

// Cached data structures to avoid recalculating on each frame
let cachedTripData: {
  tripDurations: Map<string, { duration: number; stopTimes: GtfsStopTime[]; firstTime: number }>
  tripFrequencies: Map<string, GtfsFrequency[]>
  stopsMap: Map<string, GtfsStop>
  tripsMap: Map<string, GtfsTrip>
  routesMap: Map<string, GtfsRoute>
} | null = null

let lastStopTimesLength = 0
let lastFrequenciesLength = 0
let lastStopsLength = 0

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

// Build or get cached data structures
function getCachedData(
  stopTimes: GtfsStopTime[],
  trips: GtfsTrip[],
  routes: GtfsRoute[],
  stops: GtfsStop[],
  frequencies: GtfsFrequency[]
) {
  // Invalidate cache if data changed
  if (
    cachedTripData === null ||
    stopTimes.length !== lastStopTimesLength ||
    frequencies.length !== lastFrequenciesLength ||
    stops.length !== lastStopsLength
  ) {
    lastStopTimesLength = stopTimes.length
    lastFrequenciesLength = frequencies.length
    lastStopsLength = stops.length

    // Group stop times by trip_id
    const tripStopTimes = new Map<string, GtfsStopTime[]>()
    for (const st of stopTimes) {
      const existing = tripStopTimes.get(st.trip_id) || []
      existing.push(st)
      tripStopTimes.set(st.trip_id, existing)
    }

    // Sort stop times by sequence and calculate trip durations
    const tripDurations = new Map<string, { duration: number; stopTimes: GtfsStopTime[]; firstTime: number }>()
    for (const [tripId, times] of tripStopTimes) {
      times.sort((a, b) => a.stop_sequence - b.stop_sequence)
      const firstTime = parseGtfsTime(times[0].departure_time)
      const lastTime = parseGtfsTime(times[times.length - 1].arrival_time)
      if (firstTime >= 0 && lastTime >= 0) {
        tripDurations.set(tripId, { duration: lastTime - firstTime, stopTimes: times, firstTime })
      }
    }

    // Group frequencies by trip_id
    const tripFrequencies = new Map<string, GtfsFrequency[]>()
    for (const freq of frequencies) {
      const existing = tripFrequencies.get(freq.trip_id) || []
      existing.push(freq)
      tripFrequencies.set(freq.trip_id, existing)
    }

    cachedTripData = {
      tripDurations,
      tripFrequencies,
      stopsMap: new Map(stops.map((s) => [s.stop_id, s])),
      tripsMap: new Map(trips.map((t) => [t.trip_id, t])),
      routesMap: new Map(routes.map((r) => [r.route_id, r])),
    }
  }

  return cachedTripData
}

// Get all vehicle positions at current time (optimized with caching)
export function getVehiclePositions(
  stopTimes: GtfsStopTime[],
  trips: GtfsTrip[],
  routes: GtfsRoute[],
  stops: GtfsStop[],
  frequencies: GtfsFrequency[],
  currentTimeSeconds: number
): VehiclePosition[] {
  const cache = getCachedData(stopTimes, trips, routes, stops, frequencies)
  const { tripDurations, tripFrequencies, stopsMap, tripsMap, routesMap } = cache

  const positions: VehiclePosition[] = []

  // Check if we have frequencies (frequency-based GTFS)
  if (frequencies.length > 0) {
    // For each trip with frequencies, generate vehicle instances
    for (const [tripId, freqs] of tripFrequencies) {
      const tripData = tripDurations.get(tripId)
      if (!tripData) continue

      for (const freq of freqs) {
        const freqStart = parseGtfsTime(freq.start_time)
        const freqEnd = parseGtfsTime(freq.end_time)
        const headway = freq.headway_secs

        if (freqStart < 0 || freqEnd < 0 || headway <= 0) continue

        // Calculate which vehicle instances are active at current time
        // Instead of iterating all instances, calculate directly
        const firstPossibleInstance = Math.max(0, Math.floor((currentTimeSeconds - tripData.duration - freqStart) / headway))
        const lastPossibleInstance = Math.floor((currentTimeSeconds - freqStart) / headway)

        for (let instanceNum = firstPossibleInstance; instanceNum <= lastPossibleInstance; instanceNum++) {
          const departureTime = freqStart + instanceNum * headway
          if (departureTime >= freqEnd) break

          const tripEndTime = departureTime + tripData.duration

          // Check if this instance is active at current time
          if (currentTimeSeconds >= departureTime && currentTimeSeconds <= tripEndTime) {
            const elapsedTime = currentTimeSeconds - departureTime
            const interpolated = interpolateVehiclePosition(tripData.stopTimes, stopsMap, elapsedTime)

            if (interpolated) {
              const trip = tripsMap.get(tripId)
              const route = trip ? routesMap.get(trip.route_id) : undefined

              let color = '#3388ff'
              if (route?.route_color) {
                const colorStr = String(route.route_color)
                color = colorStr.startsWith('#') ? colorStr : `#${colorStr}`
              }

              positions.push({
                tripId: `${tripId}_${instanceNum}`,
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
        }
      }
    }
  } else {
    // Regular schedule-based GTFS (no frequencies)
    for (const [tripId, tripData] of tripDurations) {
      const firstTime = tripData.firstTime
      const lastTime = firstTime + tripData.duration

      if (currentTimeSeconds >= firstTime && currentTimeSeconds <= lastTime) {
        const elapsedTime = currentTimeSeconds - firstTime
        const interpolated = interpolateVehiclePosition(tripData.stopTimes, stopsMap, elapsedTime)

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
    }
  }

  return positions
}

// Optimized vehicle position calculation using pre-computed trajectories
// Uses time-indexed buckets for O(1) lookup + binary search for segment interpolation
export function getVehiclePositionsOptimized(
  _cache: TrajectoryCache,
  timeIndex: TimeIndexedVehicles,
  currentTimeSeconds: number
): VehiclePosition[] {
  const positions: VehiclePosition[] = []

  // Get relevant buckets (current and adjacent to handle boundary cases)
  const currentBucket = Math.floor(currentTimeSeconds / timeIndex.bucketSize)
  const relevantBuckets = [currentBucket - 1, currentBucket, currentBucket + 1]

  // Collect candidates from relevant buckets
  const seenInstances = new Set<string>()

  for (const bucket of relevantBuckets) {
    const instances = timeIndex.buckets.get(bucket)
    if (!instances) continue

    for (const instance of instances) {
      // Skip if we've already processed this instance
      if (seenInstances.has(instance.instanceId)) continue
      seenInstances.add(instance.instanceId)

      // Check if this instance is active at current time
      if (currentTimeSeconds >= instance.startTime && currentTimeSeconds <= instance.endTime) {
        const elapsedTime = currentTimeSeconds - instance.startTime
        const result = interpolateOnTrajectory(instance.trajectory, elapsedTime)

        if (result) {
          positions.push({
            tripId: instance.instanceId,
            routeId: instance.routeId,
            position: result.position,
            bearing: result.bearing,
            nextStopId: result.nextStopId,
            progress: result.progress,
            color: instance.color,
            headsign: instance.headsign,
          })
        }
      }
    }
  }

  return positions
}
