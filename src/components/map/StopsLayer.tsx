import { Source, Layer } from 'react-map-gl/maplibre'
import type { FeatureCollection, Point } from 'geojson'
import type { StopProperties } from '../../services/gtfs/stopsToGeoJson'
import type { CircleLayerSpecification } from 'maplibre-gl'

interface StopsLayerProps {
  data: FeatureCollection<Point, StopProperties>
  visible?: boolean
}

// Regular intermediate stops - small red circles
const intermediateStopStyle: Omit<CircleLayerSpecification, 'id' | 'source'> = {
  type: 'circle',
  filter: ['==', ['get', 'stop_type'], 'intermediate'],
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 2, 12, 3, 16, 5],
    'circle-color': '#e74c3c',
    'circle-stroke-color': '#ffffff',
    'circle-stroke-width': 1,
  },
}

// Origin stops - green circles (slightly larger)
const originStopStyle: Omit<CircleLayerSpecification, 'id' | 'source'> = {
  type: 'circle',
  filter: ['==', ['get', 'stop_type'], 'origin'],
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 3, 12, 5, 16, 8],
    'circle-color': '#27ae60',
    'circle-stroke-color': '#ffffff',
    'circle-stroke-width': 1.5,
  },
}

// Destination stops - blue circles (slightly larger)
const destinationStopStyle: Omit<CircleLayerSpecification, 'id' | 'source'> = {
  type: 'circle',
  filter: ['==', ['get', 'stop_type'], 'destination'],
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 3, 12, 5, 16, 8],
    'circle-color': '#3498db',
    'circle-stroke-color': '#ffffff',
    'circle-stroke-width': 1.5,
  },
}

export function StopsLayer({ data, visible = true }: StopsLayerProps) {
  if (!visible || !data) return null

  return (
    <Source id="stops" type="geojson" data={data}>
      {/* Intermediate stops - red (rendered first, below terminals) */}
      <Layer id="stops-unclustered" {...intermediateStopStyle} />

      {/* Origin stops - green */}
      <Layer id="stops-origin" {...originStopStyle} />

      {/* Destination stops - blue */}
      <Layer id="stops-destination" {...destinationStopStyle} />
    </Source>
  )
}

export default StopsLayer
