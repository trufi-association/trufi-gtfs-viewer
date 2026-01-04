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

// All stops - small black circles, visible from zoom 14+
const getAllStopsStyle = (visible: boolean): Omit<CircleLayerSpecification, 'id' | 'source'> => ({
  type: 'circle',
  minzoom: 14,
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 2, 18, 4],
    'circle-color': '#000000',
    'circle-stroke-color': '#ffffff',
    'circle-stroke-width': 0.5,
  },
  layout: {
    visibility: visible ? 'visible' : 'none',
  },
})

// Origin stops - green circles (larger, overlaid)
const getOriginStopStyle = (visible: boolean): Omit<CircleLayerSpecification, 'id' | 'source'> => ({
  type: 'circle',
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 12, 6, 16, 10],
    'circle-color': '#27ae60',
    'circle-stroke-color': '#ffffff',
    'circle-stroke-width': 2,
  },
  layout: {
    visibility: visible ? 'visible' : 'none',
  },
})

// Destination stops - blue circles (larger, overlaid)
const getDestinationStopStyle = (visible: boolean): Omit<CircleLayerSpecification, 'id' | 'source'> => ({
  type: 'circle',
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 12, 6, 16, 10],
    'circle-color': '#3498db',
    'circle-stroke-color': '#ffffff',
    'circle-stroke-width': 2,
  },
  layout: {
    visibility: visible ? 'visible' : 'none',
  },
})

export function StopsLayer({ data, visible = true, originStopIds, destinationStopIds }: StopsLayerProps) {
  if (!data) return null

  // Create filtered GeoJSON for origin/destination markers
  const originStops: FeatureCollection<Point, StopProperties> = originStopIds && originStopIds.size > 0
    ? {
        type: 'FeatureCollection',
        features: data.features.filter(f => originStopIds.has(f.properties.stop_id))
      }
    : { type: 'FeatureCollection', features: [] }

  const destinationStops: FeatureCollection<Point, StopProperties> = destinationStopIds && destinationStopIds.size > 0
    ? {
        type: 'FeatureCollection',
        features: data.features.filter(f => destinationStopIds.has(f.properties.stop_id))
      }
    : { type: 'FeatureCollection', features: [] }

  return (
    <>
      {/* All stops - base layer */}
      <Source id="stops" type="geojson" data={data}>
        <Layer id="stops-unclustered" {...getAllStopsStyle(visible)} />
      </Source>

      {/* Origin stops - green overlay */}
      <Source id="stops-origin-source" type="geojson" data={originStops}>
        <Layer id="stops-origin" {...getOriginStopStyle(visible)} />
      </Source>

      {/* Destination stops - blue overlay */}
      <Source id="stops-destination-source" type="geojson" data={destinationStops}>
        <Layer id="stops-destination" {...getDestinationStopStyle(visible)} />
      </Source>
    </>
  )
}

export default StopsLayer
