import { Source, Layer, useMap } from 'react-map-gl/maplibre'
import { useEffect, useMemo } from 'react'
import type { FeatureCollection, Point } from 'geojson'
import type { StopProperties } from '../../services/gtfs/stopsToGeoJson'
import type { SymbolLayerSpecification, CircleLayerSpecification } from 'maplibre-gl'
import { useSettingsStore, TerminalIconType } from '../../store/settingsStore'

interface StopsLayerProps {
  data: FeatureCollection<Point, StopProperties>
  visible?: boolean
  originStopIds?: Set<string>
  destinationStopIds?: Set<string>
}

// Generate SVG for terminal icons with custom color
const generateTerminalSvg = (type: TerminalIconType, color: string): { svg: string; anchor: 'center' | 'bottom' } => {
  const svgs: Record<TerminalIconType, { svg: string; anchor: 'center' | 'bottom' }> = {
    circle: {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" fill="${color}" stroke="#ffffff" stroke-width="2"/>
      </svg>`,
      anchor: 'center',
    },
    square: {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="3" fill="${color}" stroke="#ffffff" stroke-width="2"/>
      </svg>`,
      anchor: 'center',
    },
    diamond: {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <path d="M12 2 L22 12 L12 22 L2 12 Z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
      </svg>`,
      anchor: 'center',
    },
    pin: {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="34" viewBox="0 0 24 34">
        <path d="M12 0 C5.5 0 0 5.5 0 12 C0 21 12 34 12 34 C12 34 24 21 24 12 C24 5.5 18.5 0 12 0 Z" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
        <circle cx="12" cy="12" r="5" fill="#ffffff"/>
      </svg>`,
      anchor: 'bottom',
    },
    flag: {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32">
        <rect x="3" y="0" width="3" height="32" fill="${color}" stroke="#ffffff" stroke-width="1"/>
        <path d="M6 2 L22 2 L17 9 L22 16 L6 16 Z" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
      </svg>`,
      anchor: 'bottom',
    },
    star: {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <path d="M12 1 L15 9 L23 9.5 L17 15 L19 23 L12 18.5 L5 23 L7 15 L1 9.5 L9 9 Z" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
      </svg>`,
      anchor: 'center',
    },
  }
  return svgs[type]
}

// Circle style for regular stops (always visible at all zoom levels)
const getAllStopsStyle = (visible: boolean, size: number): Omit<CircleLayerSpecification, 'id' | 'source'> => ({
  type: 'circle',
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 4 * size, 8, 5 * size, 12, 6 * size, 16, 8 * size],
    'circle-color': '#000000',
    'circle-stroke-color': '#ffffff',
    'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 2, 1.5, 12, 2, 16, 3],
  },
  layout: {
    visibility: visible ? 'visible' : 'none',
  },
})

// Symbol style for origin stops
const getOriginStopStyle = (visible: boolean, size: number, anchor: 'center' | 'bottom'): Omit<SymbolLayerSpecification, 'id' | 'source'> => ({
  type: 'symbol',
  layout: {
    'icon-image': 'origin-stop-icon',
    'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.4 * size, 12, 0.6 * size, 16, 1.0 * size],
    'icon-anchor': anchor,
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
    visibility: visible ? 'visible' : 'none',
  },
})

// Symbol style for destination stops
const getDestinationStopStyle = (visible: boolean, size: number, anchor: 'center' | 'bottom'): Omit<SymbolLayerSpecification, 'id' | 'source'> => ({
  type: 'symbol',
  layout: {
    'icon-image': 'destination-stop-icon',
    'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.4 * size, 12, 0.6 * size, 16, 1.0 * size],
    'icon-anchor': anchor,
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
    visibility: visible ? 'visible' : 'none',
  },
})

export function StopsLayer({ data, visible = true, originStopIds, destinationStopIds }: StopsLayerProps) {
  const { current: map } = useMap()
  const { markers } = useSettingsStore()
  const {
    stopSize = 1.0,
    originIcon = 'circle',
    originSize = 1.0,
    originColor = '#27ae60',
    destinationIcon = 'pin',
    destinationSize = 1.0,
    destinationColor = '#e74c3c'
  } = markers || {}

  // Generate SVG data for origin and destination icons
  const originSvgData = useMemo(() => generateTerminalSvg(originIcon, originColor), [originIcon, originColor])
  const destinationSvgData = useMemo(() => generateTerminalSvg(destinationIcon, destinationColor), [destinationIcon, destinationColor])

  // Add stop icons to the map (for origin/destination markers)
  useEffect(() => {
    if (!map) return

    const loadIcon = (name: string, svgData: string) => {
      const img = new Image()
      img.onload = () => {
        if (!map.isStyleLoaded()) return
        try {
          if (map.hasImage(name)) {
            map.removeImage(name)
          }
          map.addImage(name, img)
        } catch (e) {
          // Ignore errors if map is not ready
        }
      }
      img.src = `data:image/svg+xml;base64,${btoa(svgData)}`
    }

    const addIcons = () => {
      // Wait for style to be loaded
      if (!map.isStyleLoaded()) return
      loadIcon('origin-stop-icon', originSvgData.svg)
      loadIcon('destination-stop-icon', destinationSvgData.svg)
    }

    // Handle missing images - load them on demand
    const handleMissingImage = (e: { id: string }) => {
      if (e.id === 'origin-stop-icon') {
        loadIcon('origin-stop-icon', originSvgData.svg)
      } else if (e.id === 'destination-stop-icon') {
        loadIcon('destination-stop-icon', destinationSvgData.svg)
      }
    }

    // Add icons now if style is ready
    if (map.isStyleLoaded()) {
      addIcons()
    }

    // Listen for events
    map.on('style.load', addIcons)
    map.on('load', addIcons)
    map.on('styleimagemissing', handleMissingImage)

    // Also try after a short delay to handle race conditions
    const timeoutId = setTimeout(() => {
      if (map.isStyleLoaded()) {
        addIcons()
      }
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      map.off('style.load', addIcons)
      map.off('load', addIcons)
      map.off('styleimagemissing', handleMissingImage)
    }
  }, [map, originSvgData, destinationSvgData])

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
      {/* All stops - base layer (circle for reliability) */}
      <Source id="stops" type="geojson" data={data}>
        <Layer id="stops-unclustered" {...getAllStopsStyle(visible, stopSize)} />
      </Source>

      {/* Origin stops overlay */}
      <Source id="stops-origin-source" type="geojson" data={originStops}>
        <Layer id="stops-origin" {...getOriginStopStyle(visible, originSize, originSvgData.anchor)} />
      </Source>

      {/* Destination stops overlay */}
      <Source id="stops-destination-source" type="geojson" data={destinationStops}>
        <Layer id="stops-destination" {...getDestinationStopStyle(visible, destinationSize, destinationSvgData.anchor)} />
      </Source>
    </>
  )
}

export default StopsLayer
