import { Source, Layer } from 'react-map-gl/maplibre'
import type { FeatureCollection, Point } from 'geojson'
import type { VehiclePosition } from '../../types/gtfs'
import type { CircleLayerSpecification } from 'maplibre-gl'

interface VehiclesLayerProps {
  positions: VehiclePosition[]
  visible?: boolean
}

function vehiclesToGeoJson(positions: VehiclePosition[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: positions.map((v) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: v.position,
      },
      properties: {
        tripId: v.tripId,
        routeId: v.routeId,
        color: v.color,
        bearing: v.bearing,
        headsign: v.headsign,
        nextStopId: v.nextStopId,
      },
    })),
  }
}

const vehicleStyle: Omit<CircleLayerSpecification, 'id' | 'source'> = {
  type: 'circle',
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 12, 7, 16, 10],
    'circle-color': ['get', 'color'],
    'circle-stroke-color': '#ffffff',
    'circle-stroke-width': 2,
  },
}

export function VehiclesLayer({ positions, visible = true }: VehiclesLayerProps) {
  if (!visible || positions.length === 0) return null

  const geoJson = vehiclesToGeoJson(positions)

  return (
    <Source id="vehicles" type="geojson" data={geoJson}>
      <Layer id="vehicles-points" {...vehicleStyle} />
    </Source>
  )
}

export default VehiclesLayer
