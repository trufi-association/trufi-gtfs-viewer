import { Source, Layer } from 'react-map-gl/maplibre'
import type { FeatureCollection, Point } from 'geojson'
import type { StopProperties } from '../../services/gtfs/stopsToGeoJson'
import type { CircleLayerSpecification } from 'maplibre-gl'

interface StopsLayerProps {
  data: FeatureCollection<Point, StopProperties>
  visible?: boolean
  originStopIds?: Set<string>
  destinationStopIds?: Set<string>
}

// All stops - small dark circles
const allStopsStyle: Omit<CircleLayerSpecification, 'id' | 'source'> = {
  type: 'circle',
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 2, 12, 3, 16, 5],
    'circle-color': '#e74c3c',
    'circle-stroke-color': '#ffffff',
    'circle-stroke-width': 1,
  },
}

// Origin stops - green circles (larger, overlaid)
const originStopStyle: Omit<CircleLayerSpecification, 'id' | 'source'> = {
  type: 'circle',
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 12, 6, 16, 10],
    'circle-color': '#27ae60',
    'circle-stroke-color': '#ffffff',
    'circle-stroke-width': 2,
  },
}

// Destination stops - blue circles (larger, overlaid)
const destinationStopStyle: Omit<CircleLayerSpecification, 'id' | 'source'> = {
  type: 'circle',
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 12, 6, 16, 10],
    'circle-color': '#3498db',
    'circle-stroke-color': '#ffffff',
    'circle-stroke-width': 2,
  },
}

export function StopsLayer({ data, visible = true, originStopIds, destinationStopIds }: StopsLayerProps) {
  if (!visible || !data) return null

  // Create filtered GeoJSON for origin/destination markers
  const originStops: FeatureCollection<Point, StopProperties> | null = originStopIds && originStopIds.size > 0
    ? {
        type: 'FeatureCollection',
        features: data.features.filter(f => originStopIds.has(f.properties.stop_id))
      }
    : null

  const destinationStops: FeatureCollection<Point, StopProperties> | null = destinationStopIds && destinationStopIds.size > 0
    ? {
        type: 'FeatureCollection',
        features: data.features.filter(f => destinationStopIds.has(f.properties.stop_id))
      }
    : null

  return (
    <>
      {/* All stops - red base layer */}
      <Source id="stops" type="geojson" data={data}>
        <Layer id="stops-unclustered" {...allStopsStyle} />
      </Source>

      {/* Origin stops - green overlay */}
      {originStops && originStops.features.length > 0 && (
        <Source id="stops-origin-source" type="geojson" data={originStops}>
          <Layer id="stops-origin" {...originStopStyle} />
        </Source>
      )}

      {/* Destination stops - blue overlay */}
      {destinationStops && destinationStops.features.length > 0 && (
        <Source id="stops-destination-source" type="geojson" data={destinationStops}>
          <Layer id="stops-destination" {...destinationStopStyle} />
        </Source>
      )}
    </>
  )
}

export default StopsLayer
