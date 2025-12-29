import type { FeatureCollection, Point } from 'geojson'
import type { GtfsStop } from '../../types/gtfs'

export interface StopProperties {
  stop_id: string
  stop_name: string
  stop_code?: string
  zone_id?: string
  location_type?: number
  parent_station?: string
  stop_lat: number
  stop_lon: number
}

export function stopsToGeoJson(
  stops: GtfsStop[]
): FeatureCollection<Point, StopProperties> {
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
