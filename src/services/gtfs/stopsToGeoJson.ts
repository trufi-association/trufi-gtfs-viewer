import type { FeatureCollection, Point } from 'geojson'
import type { GtfsStop, GtfsStopTime } from '../../types/gtfs'

export type StopType = 'origin' | 'destination' | 'intermediate'

export interface StopProperties {
  stop_id: string
  stop_name: string
  stop_code?: string
  zone_id?: string
  location_type?: number
  parent_station?: string
  stop_lat: number
  stop_lon: number
  stop_type: StopType
}

// Determine stop types (origin, destination, intermediate) based on trip sequences
function calculateStopTypes(
  stops: GtfsStop[],
  stopTimes: GtfsStopTime[]
): Map<string, StopType> {
  const originStops = new Set<string>()
  const destinationStops = new Set<string>()
  const allStops = new Set<string>()

  // Group stop times by trip
  const tripStopTimes = new Map<string, GtfsStopTime[]>()
  for (const st of stopTimes) {
    const existing = tripStopTimes.get(st.trip_id) || []
    existing.push(st)
    tripStopTimes.set(st.trip_id, existing)
    allStops.add(st.stop_id)
  }

  // Find first and last stop of each trip
  for (const times of tripStopTimes.values()) {
    if (times.length < 2) continue
    times.sort((a, b) => a.stop_sequence - b.stop_sequence)
    originStops.add(times[0].stop_id)
    destinationStops.add(times[times.length - 1].stop_id)
  }

  // Assign stop types
  const stopTypes = new Map<string, StopType>()
  for (const stop of stops) {
    const isOrigin = originStops.has(stop.stop_id)
    const isDestination = destinationStops.has(stop.stop_id)

    // A stop can be both origin and destination for different trips
    // Priority: if it's an origin for any trip, mark as origin
    if (isOrigin && !isDestination) {
      stopTypes.set(stop.stop_id, 'origin')
    } else if (isDestination && !isOrigin) {
      stopTypes.set(stop.stop_id, 'destination')
    } else if (isOrigin && isDestination) {
      // Both origin and destination - mark as origin (terminal)
      stopTypes.set(stop.stop_id, 'origin')
    } else {
      stopTypes.set(stop.stop_id, 'intermediate')
    }
  }

  return stopTypes
}

export function stopsToGeoJson(
  stops: GtfsStop[],
  stopTimes: GtfsStopTime[] = []
): FeatureCollection<Point, StopProperties> {
  const stopTypes = stopTimes.length > 0
    ? calculateStopTypes(stops, stopTimes)
    : new Map<string, StopType>()

  return {
    type: 'FeatureCollection',
    features: stops
      .filter((stop) => stop.stop_lat != null && stop.stop_lon != null)
      .map((stop) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [stop.stop_lon, stop.stop_lat],
        },
        properties: {
          stop_id: stop.stop_id,
          stop_name: stop.stop_name,
          stop_code: stop.stop_code,
          zone_id: stop.zone_id,
          location_type: stop.location_type,
          parent_station: stop.parent_station,
          stop_lat: stop.stop_lat,
          stop_lon: stop.stop_lon,
          stop_type: stopTypes.get(stop.stop_id) ?? 'intermediate',
        },
      })),
  }
}

export function calculateBounds(
  stops: GtfsStop[]
): [[number, number], [number, number]] | null {
  const validStops = stops.filter(
    (s) => s.stop_lat != null && s.stop_lon != null
  )
  if (validStops.length === 0) return null

  let minLon = Infinity
  let maxLon = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity

  for (const stop of validStops) {
    minLon = Math.min(minLon, stop.stop_lon)
    maxLon = Math.max(maxLon, stop.stop_lon)
    minLat = Math.min(minLat, stop.stop_lat)
    maxLat = Math.max(maxLat, stop.stop_lat)
  }

  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ]
}
