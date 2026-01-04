import { Source, Layer } from 'react-map-gl/maplibre'
import type { FeatureCollection, LineString } from 'geojson'
import type { ShapeProperties } from '../../services/gtfs/shapesToGeoJson'
import type { LineLayerSpecification } from 'maplibre-gl'

interface ShapesLayerProps {
  data: FeatureCollection<LineString, ShapeProperties>
  visible?: boolean
  selectedRouteIds?: Set<string>
  selectedRouteTypes?: Set<number>
}

const getShapesStyle = (visible: boolean): Omit<LineLayerSpecification, 'id' | 'source'> => ({
  type: 'line',
  paint: {
    'line-color': ['get', 'color'],
    'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.5, 12, 2.5, 16, 4],
    'line-opacity': 0.85,
  },
  layout: {
    'line-cap': 'round',
    'line-join': 'round',
    visibility: visible ? 'visible' : 'none',
  },
})

export function ShapesLayer({
  data,
  visible = true,
  selectedRouteIds,
  selectedRouteTypes,
}: ShapesLayerProps) {
  if (!data) return null

  // Filter data if there are selected routes or route types
  let filteredData = data
  if (
    (selectedRouteIds && selectedRouteIds.size > 0) ||
    (selectedRouteTypes && selectedRouteTypes.size > 0)
  ) {
    filteredData = {
      ...data,
      features: data.features.filter((f) => {
        const matchesRoute =
          !selectedRouteIds ||
          selectedRouteIds.size === 0 ||
          (f.properties.route_id && selectedRouteIds.has(f.properties.route_id))

        const matchesType =
          !selectedRouteTypes ||
          selectedRouteTypes.size === 0 ||
          (f.properties.route_type !== undefined &&
            selectedRouteTypes.has(f.properties.route_type))

        return matchesRoute && matchesType
      }),
    }
  }

  return (
    <Source id="shapes" type="geojson" data={filteredData}>
      <Layer id="shapes-lines" {...getShapesStyle(visible)} />
    </Source>
  )
}

export default ShapesLayer
