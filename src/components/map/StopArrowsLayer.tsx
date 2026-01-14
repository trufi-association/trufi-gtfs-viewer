import { Source, Layer } from 'react-map-gl/maplibre'
import { useMemo } from 'react'
import type { FeatureCollection, LineString } from 'geojson'
import type { GtfsStopTime, GtfsTrip, GtfsStop, GtfsRoute } from '../../types/gtfs'
import type { LineLayerSpecification } from 'maplibre-gl'

interface StopArrowsLayerProps {
  stopTimes: GtfsStopTime[]
  trips: GtfsTrip[]
  stops: GtfsStop[]
  routes: GtfsRoute[]
  visible?: boolean
  selectedRouteIds?: Set<string>
  selectedTripIds?: Set<string>
}

interface LineProperties {
  route_id: string
  trip_id: string
  from_stop_id: string
  to_stop_id: string
  sequence: number
}

const getStopLinesStyle = (visible: boolean): Omit<LineLayerSpecification, 'id' | 'source'> => ({
  type: 'line',
  paint: {
    'line-color': '#e53935',
    'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 14, 3, 18, 5],
    'line-opacity': 0.8,
  },
  layout: {
    'line-cap': 'round',
    'line-join': 'round',
    visibility: visible ? 'visible' : 'none',
  },
})

export function StopArrowsLayer({
  stopTimes,
  trips,
  stops,
  visible = true,
  selectedRouteIds,
  selectedTripIds,
}: StopArrowsLayerProps) {
  // Build GeoJSON for lines between stops
  const linesGeoJson = useMemo(() => {
    const stopsMap = new Map(stops.map(s => [s.stop_id, s]))

    // Group stop times by trip
    const tripStopTimes = new Map<string, GtfsStopTime[]>()
    for (const st of stopTimes) {
      const existing = tripStopTimes.get(st.trip_id) || []
      existing.push(st)
      tripStopTimes.set(st.trip_id, existing)
    }

    // Get route ID for each trip
    const tripRouteMap = new Map(trips.map(t => [t.trip_id, t.route_id]))

    // Trips are the primary filter - if no trips selected, show nothing
    if (!selectedTripIds || selectedTripIds.size === 0) {
      return {
        type: 'FeatureCollection' as const,
        features: [],
      }
    }

    // Use only selected trips
    const tripsToProcess = Array.from(selectedTripIds)

    const lineFeatures: FeatureCollection<LineString, LineProperties>['features'] = []

    for (const tripId of tripsToProcess) {
      const routeId = tripRouteMap.get(tripId)
      if (!routeId) continue

      const times = tripStopTimes.get(tripId)
      if (!times || times.length < 2) continue

      // Sort by sequence
      times.sort((a, b) => a.stop_sequence - b.stop_sequence)

      // Create line segments between consecutive stops
      for (let i = 0; i < times.length - 1; i++) {
        const fromStop = stopsMap.get(times[i].stop_id)
        const toStop = stopsMap.get(times[i + 1].stop_id)

        if (!fromStop || !toStop) continue

        lineFeatures.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [fromStop.stop_lon, fromStop.stop_lat],
              [toStop.stop_lon, toStop.stop_lat],
            ],
          },
          properties: {
            route_id: routeId,
            trip_id: tripId,
            from_stop_id: times[i].stop_id,
            to_stop_id: times[i + 1].stop_id,
            sequence: i,
          },
        })
      }
    }

    return {
      type: 'FeatureCollection' as const,
      features: lineFeatures,
    }
  }, [stopTimes, trips, stops, selectedRouteIds, selectedTripIds])

  return (
    <Source id="stop-lines" type="geojson" data={linesGeoJson}>
      <Layer id="stop-lines-layer" {...getStopLinesStyle(visible)} />
    </Source>
  )
}

export default StopArrowsLayer
