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

// Simple car icon - black with white accents, top-down view
const carSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="28" viewBox="0 0 16 28">
  <!-- Car body -->
  <path d="M3 6 L3 22 Q3 24 5 24 L11 24 Q13 24 13 22 L13 6 Q13 3 8 2 Q3 3 3 6 Z" fill="#1a1a1a" stroke="#fff" stroke-width="1"/>
  <!-- Windshield -->
  <path d="M5 7 Q8 5.5 11 7 L11 10 Q8 9 5 10 Z" fill="#fff" opacity="0.8"/>
  <!-- Rear window -->
  <path d="M5 18 Q8 19 11 18 L11 21 Q8 20.5 5 21 Z" fill="#fff" opacity="0.6"/>
</svg>`

const carDataUrl = `data:image/svg+xml;base64,${btoa(carSvg)}`

const getVehicleStyle = (visible: boolean): Omit<SymbolLayerSpecification, 'id' | 'source'> => ({
  type: 'symbol',
  layout: {
    'icon-image': 'car-icon',
    'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.6, 12, 1.0, 16, 1.3],
    'icon-rotate': ['get', 'bearing'],
    'icon-rotation-alignment': 'map',
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
    visibility: visible ? 'visible' : 'none',
  },
})

export function VehiclesLayer({ positions, visible = true }: VehiclesLayerProps) {
  const { current: map } = useMap()

  // Add the car icon to the map
  useEffect(() => {
    if (!map) return

    const addIcon = () => {
      if (!map.hasImage('car-icon')) {
        const img = new Image()
        img.onload = () => {
          if (!map.hasImage('car-icon')) {
            map.addImage('car-icon', img)
          }
        }
        img.src = carDataUrl
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

  const geoJson = vehiclesToGeoJson(positions)

  return (
    <Source id="vehicles" type="geojson" data={geoJson}>
      <Layer id="vehicles-points" {...getVehicleStyle(visible)} />
    </Source>
  )
}

export default VehiclesLayer
