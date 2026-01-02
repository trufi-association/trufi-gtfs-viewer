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

// Vehicle car icon as SVG - Uber-style top-down view
const vehicleCarSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">
  <!-- Shadow -->
  <ellipse cx="12" cy="34" rx="8" ry="2" fill="#000" opacity="0.2"/>
  <!-- Car body -->
  <path d="M4 10 L4 26 Q4 28 6 28 L18 28 Q20 28 20 26 L20 10 Q20 6 12 4 Q4 6 4 10 Z" fill="#1a1a1a" stroke="#333" stroke-width="0.5"/>
  <!-- Roof/cabin -->
  <path d="M6 12 L6 20 Q6 21 7 21 L17 21 Q18 21 18 20 L18 12 Q18 9 12 8 Q6 9 6 12 Z" fill="#2d2d2d"/>
  <!-- Front windshield -->
  <path d="M7 11 Q12 9 17 11 L17 13 Q12 11.5 7 13 Z" fill="#4a90d9" opacity="0.8"/>
  <!-- Rear windshield -->
  <path d="M7 18 Q12 19 17 18 L17 20 Q12 20.5 7 20 Z" fill="#4a90d9" opacity="0.6"/>
  <!-- Headlights -->
  <rect x="7" y="5" width="3" height="1.5" rx="0.5" fill="#fff" opacity="0.9"/>
  <rect x="14" y="5" width="3" height="1.5" rx="0.5" fill="#fff" opacity="0.9"/>
  <!-- Taillights -->
  <rect x="7" y="26" width="3" height="1" rx="0.5" fill="#ff4444"/>
  <rect x="14" y="26" width="3" height="1" rx="0.5" fill="#ff4444"/>
</svg>`

const vehicleCarDataUrl = `data:image/svg+xml;base64,${btoa(vehicleCarSvg)}`

const vehicleStyle: Omit<SymbolLayerSpecification, 'id' | 'source'> = {
  type: 'symbol',
  layout: {
    'icon-image': 'vehicle-car',
    'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.6, 12, 0.9, 16, 1.2],
    'icon-rotate': ['get', 'bearing'],
    'icon-rotation-alignment': 'map',
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
  },
}

export function VehiclesLayer({ positions, visible = true }: VehiclesLayerProps) {
  const { current: map } = useMap()

  // Add the vehicle car icon to the map
  useEffect(() => {
    if (!map) return

    const addIcon = () => {
      if (!map.hasImage('vehicle-car')) {
        const img = new Image()
        img.onload = () => {
          if (!map.hasImage('vehicle-car')) {
            map.addImage('vehicle-car', img)
          }
        }
        img.src = vehicleCarDataUrl
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
