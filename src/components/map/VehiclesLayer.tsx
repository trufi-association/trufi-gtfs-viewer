import { Source, Layer, useMap } from 'react-map-gl/maplibre'
import { useEffect } from 'react'
import type { FeatureCollection, Point } from 'geojson'
import type { VehiclePosition } from '../../types/gtfs'
import type { SymbolLayerSpecification } from 'maplibre-gl'

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

// Vehicle bus icon as SVG - top-down view of a bus
const vehicleBusSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48">
  <!-- Bus body -->
  <rect x="4" y="4" width="24" height="40" rx="4" ry="4" fill="#3388ff" stroke="#ffffff" stroke-width="2"/>
  <!-- Front windshield -->
  <rect x="7" y="6" width="18" height="8" rx="2" ry="2" fill="#1a1a2e" opacity="0.8"/>
  <!-- Side windows -->
  <rect x="7" y="16" width="18" height="5" rx="1" fill="#1a1a2e" opacity="0.6"/>
  <rect x="7" y="23" width="18" height="5" rx="1" fill="#1a1a2e" opacity="0.6"/>
  <rect x="7" y="30" width="18" height="5" rx="1" fill="#1a1a2e" opacity="0.6"/>
  <!-- Wheels -->
  <rect x="1" y="10" width="4" height="8" rx="1" fill="#333"/>
  <rect x="27" y="10" width="4" height="8" rx="1" fill="#333"/>
  <rect x="1" y="30" width="4" height="8" rx="1" fill="#333"/>
  <rect x="27" y="30" width="4" height="8" rx="1" fill="#333"/>
</svg>`

const vehicleBusDataUrl = `data:image/svg+xml;base64,${btoa(vehicleBusSvg)}`

const vehicleStyle: Omit<SymbolLayerSpecification, 'id' | 'source'> = {
  type: 'symbol',
  layout: {
    'icon-image': 'vehicle-bus',
    'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.4, 12, 0.6, 16, 0.8],
    'icon-rotate': ['get', 'bearing'],
    'icon-rotation-alignment': 'map',
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
  },
}

export function VehiclesLayer({ positions, visible = true }: VehiclesLayerProps) {
  const { current: map } = useMap()

  // Add the vehicle bus icon to the map
  useEffect(() => {
    if (!map) return

    const addIcon = () => {
      if (!map.hasImage('vehicle-bus')) {
        const img = new Image()
        img.onload = () => {
          if (!map.hasImage('vehicle-bus')) {
            map.addImage('vehicle-bus', img)
          }
        }
        img.src = vehicleBusDataUrl
      }
    }

    if (map.loaded()) {
      addIcon()
    } else {
      map.on('load', addIcon)
    }

    return () => {
      map.off('load', addIcon)
    }
  }, [map])

  if (!visible || positions.length === 0) return null

  const geoJson = vehiclesToGeoJson(positions)

  return (
    <Source id="vehicles" type="geojson" data={geoJson}>
      <Layer id="vehicles-points" {...vehicleStyle} />
    </Source>
  )
}

export default VehiclesLayer
