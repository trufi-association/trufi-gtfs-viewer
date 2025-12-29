import { Source, Layer } from 'react-map-gl/maplibre'
import type { FeatureCollection, Point } from 'geojson'
import type { StopProperties } from '../../services/gtfs/stopsToGeoJson'
import type { CircleLayerSpecification } from 'maplibre-gl'

interface StopsLayerProps {
  data: FeatureCollection<Point, StopProperties>
  visible?: boolean
}

const unclusteredPointStyle: Omit<CircleLayerSpecification, 'id' | 'source'> = {
  type: 'circle',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 3, 12, 5, 16, 8],
    'circle-color': '#e74c3c',
    'circle-stroke-color': '#ffffff',
    'circle-stroke-width': 1.5,
  },
}

const clusterStyle: Omit<CircleLayerSpecification, 'id' | 'source'> = {
  type: 'circle',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': [
      'step',
      ['get', 'point_count'],
      '#f39c12',
      10,
      '#e67e22',
      50,
      '#d35400',
    ],
    'circle-radius': ['step', ['get', 'point_count'], 15, 10, 20, 50, 25],
  },
}

export function StopsLayer({ data, visible = true }: StopsLayerProps) {

  if (!visible || !data) return null

  return (
    <Source
      id="stops"
      type="geojson"
      data={data}
      cluster={true}
      clusterMaxZoom={14}
      clusterRadius={50}
    >
      {/* Clustered points */}
      <Layer id="stops-clusters" {...clusterStyle} />

      {/* Cluster count labels */}
      <Layer
        id="stops-cluster-count"
        type="symbol"
        filter={['has', 'point_count']}
        layout={{
          'text-field': '{point_count_abbreviated}',
          'text-size': 12,
        }}
        paint={{
          'text-color': '#ffffff',
        }}
      />

      {/* Individual stops */}
      <Layer id="stops-unclustered" {...unclusteredPointStyle} />
    </Source>
  )
}

export default StopsLayer
