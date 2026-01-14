import { Source, Layer, useMap } from 'react-map-gl/maplibre'
import { useEffect } from 'react'
import type { FeatureCollection, Point } from 'geojson'
import type { VehiclePosition } from '../../types/gtfs'
import type { SymbolLayerSpecification } from 'maplibre-gl'
import { useSettingsStore, VehicleIconType } from '../../store/settingsStore'

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

// Vehicle icons SVGs
const vehicleSvgs: Record<VehicleIconType, string> = {
  car: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="28" viewBox="0 0 16 28">
  <path d="M3 6 L3 22 Q3 24 5 24 L11 24 Q13 24 13 22 L13 6 Q13 3 8 2 Q3 3 3 6 Z" fill="#1a1a1a" stroke="#fff" stroke-width="1"/>
  <path d="M5 7 Q8 5.5 11 7 L11 10 Q8 9 5 10 Z" fill="#fff" opacity="0.8"/>
  <path d="M5 18 Q8 19 11 18 L11 21 Q8 20.5 5 21 Z" fill="#fff" opacity="0.6"/>
</svg>`,
  bus: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="32" viewBox="0 0 20 32">
  <rect x="2" y="2" width="16" height="28" rx="3" fill="#1a1a1a" stroke="#fff" stroke-width="1"/>
  <rect x="4" y="4" width="12" height="6" rx="1" fill="#fff" opacity="0.8"/>
  <rect x="4" y="22" width="12" height="4" rx="1" fill="#fff" opacity="0.6"/>
  <circle cx="5" cy="28" r="1.5" fill="#333"/>
  <circle cx="15" cy="28" r="1.5" fill="#333"/>
</svg>`,
  minibus: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="26" viewBox="0 0 18 26">
  <rect x="2" y="2" width="14" height="22" rx="4" fill="#1a1a1a" stroke="#fff" stroke-width="1"/>
  <rect x="4" y="4" width="10" height="5" rx="1" fill="#fff" opacity="0.8"/>
  <rect x="4" y="18" width="10" height="3" rx="1" fill="#fff" opacity="0.6"/>
</svg>`,
  arrow: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
  <path d="M10 2 L18 18 L10 14 L2 18 Z" fill="#1a1a1a" stroke="#fff" stroke-width="1"/>
</svg>`,
}

const getVehicleStyle = (visible: boolean, size: number): Omit<SymbolLayerSpecification, 'id' | 'source'> => ({
  type: 'symbol',
  layout: {
    'icon-image': 'vehicle-icon',
    'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.6 * size, 12, 1.0 * size, 16, 1.3 * size],
    'icon-rotate': ['get', 'bearing'],
    'icon-rotation-alignment': 'map',
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
    visibility: visible ? 'visible' : 'none',
  },
})

export function VehiclesLayer({ positions, visible = true }: VehiclesLayerProps) {
  const { current: map } = useMap()
  const { markers } = useSettingsStore()
  const { vehicleIcon, vehicleSize } = markers

  // Add the vehicle icon to the map
  useEffect(() => {
    if (!map) return

    const addIcon = () => {
      // Remove old icon if exists
      if (map.hasImage('vehicle-icon')) {
        map.removeImage('vehicle-icon')
      }

      const svg = vehicleSvgs[vehicleIcon]
      const dataUrl = `data:image/svg+xml;base64,${btoa(svg)}`

      const img = new Image()
      img.onload = () => {
        if (map.hasImage('vehicle-icon')) {
          map.removeImage('vehicle-icon')
        }
        map.addImage('vehicle-icon', img)
      }
      img.src = dataUrl
    }

    if (map.loaded()) {
      addIcon()
    } else {
      map.on('load', addIcon)
    }

    return () => {
      map.off('load', addIcon)
    }
  }, [map, vehicleIcon])

  const geoJson = vehiclesToGeoJson(positions)

  return (
    <Source id="vehicles" type="geojson" data={geoJson}>
      <Layer id="vehicles-points" {...getVehicleStyle(visible, vehicleSize)} />
    </Source>
  )
}

export default VehiclesLayer
