import { Source, Layer } from 'react-map-gl/maplibre'
import { useMemo } from 'react'
import type { FeatureCollection, LineString } from 'geojson'
import type { ShapeProperties } from '../../services/gtfs/shapesToGeoJson'
import type { LineLayerSpecification } from 'maplibre-gl'
import type { GtfsTrip } from '../../types/gtfs'
import { useSettingsStore } from '../../store/settingsStore'

interface ShapesLayerProps {
  data: FeatureCollection<LineString, ShapeProperties>
  visible?: boolean
  selectedRouteIds?: Set<string>
  selectedRouteTypes?: Set<number>
  selectedTripIds?: Set<string>
  trips?: GtfsTrip[]
}

const getShapesStyle = (visible: boolean, lineWidth: number): Omit<LineLayerSpecification, 'id' | 'source'> => ({
  type: 'line',
  paint: {
    'line-color': ['get', 'color'],
    'line-width': ['interpolate', ['linear'], ['zoom'], 8, lineWidth * 0.5, 12, lineWidth * 0.8, 16, lineWidth * 1.3],
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
  selectedTripIds,
  trips = [],
}: ShapesLayerProps) {
  const { markers } = useSettingsStore()
  const { routeLineWidth } = markers

  // Get shape_ids for selected trips
  const selectedShapeIds = useMemo(() => {
    if (!selectedTripIds || selectedTripIds.size === 0 || trips.length === 0) {
      return new Set<string>()
    }
    const shapeIds = new Set<string>()
    for (const trip of trips) {
      if (selectedTripIds.has(trip.trip_id) && trip.shape_id) {
        shapeIds.add(trip.shape_id)
      }
    }
    return shapeIds
  }, [selectedTripIds, trips])

  // Filter data by selected shape_ids (from selected trips)
  const filteredData = useMemo(() => {
    if (!data) return { type: 'FeatureCollection' as const, features: [] }

    // Trips are the primary filter - if no trips selected, show nothing
    if (selectedShapeIds.size === 0) {
      return { type: 'FeatureCollection' as const, features: [] }
    }

    return {
      ...data,
      features: data.features.filter((f) => {
        return f.properties.shape_id && selectedShapeIds.has(f.properties.shape_id)
      }),
    }
  }, [data, selectedShapeIds])

  if (!data) return null

  return (
    <Source id="shapes" type="geojson" data={filteredData}>
      <Layer id="shapes-lines" {...getShapesStyle(visible, routeLineWidth)} />
    </Source>
  )
}

export default ShapesLayer
