import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import MapGL, { NavigationControl, ScaleControl, Popup, MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useGtfsStore } from '../../store/gtfsStore'
import { useUiStore } from '../../store/uiStore'
import { useTimetableStore } from '../../store/timetableStore'
import StopsLayer from './StopsLayer'
import ShapesLayer from './ShapesLayer'
import VehiclesLayer from './VehiclesLayer'
import { getVehiclePositions } from '../../services/gtfs/vehicleInterpolator'
import type { MapLayerMouseEvent } from 'maplibre-gl'
import type { FeatureCollection, Point } from 'geojson'
import type { StopProperties } from '../../services/gtfs/stopsToGeoJson'

const INITIAL_VIEW_STATE = {
  longitude: 0,
  latitude: 20,
  zoom: 2,
}

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

interface PopupInfo {
  longitude: number
  latitude: number
  type: 'stop' | 'vehicle'
  properties: Record<string, unknown>
}

export function Map() {
  const mapRef = useRef<MapRef>(null)
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const hasFittedBounds = useRef(false)

  const { stopsGeoJson, shapesGeoJson, bounds, stops, routes, trips, stopTimes } =
    useGtfsStore()
  const { layerVisibility, selectedRouteIds, selectedRouteTypes, setSelectedStop } =
    useUiStore()
  const { currentTimeSeconds, isPlaying, vehiclePositions, setVehiclePositions } =
    useTimetableStore()

  // Get stop IDs that belong to selected routes
  const selectedStopIds = useMemo(() => {
    if (selectedRouteIds.size === 0) return null // null means show all

    // Get trip IDs for selected routes
    const selectedTripIds = new Set(
      trips
        .filter((t) => selectedRouteIds.has(t.route_id))
        .map((t) => t.trip_id)
    )

    // Get stop IDs from stop_times for those trips
    const stopIds = new Set<string>()
    for (const st of stopTimes) {
      if (selectedTripIds.has(st.trip_id)) {
        stopIds.add(st.stop_id)
      }
    }

    return stopIds
  }, [selectedRouteIds, trips, stopTimes])

  // Filter stops GeoJSON based on selected routes
  const filteredStopsGeoJson = useMemo((): FeatureCollection<Point, StopProperties> | null => {
    if (!stopsGeoJson) return null
    if (!selectedStopIds) return stopsGeoJson // Show all if no route selected

    return {
      ...stopsGeoJson,
      features: stopsGeoJson.features.filter((f) =>
        selectedStopIds.has(f.properties.stop_id)
      ),
    }
  }, [stopsGeoJson, selectedStopIds])

  // Handle map load
  const handleMapLoad = useCallback(() => {
    setMapLoaded(true)
  }, [])

  // Fit bounds when map loads and data is available
  useEffect(() => {
    if (bounds && mapLoaded && mapRef.current && !hasFittedBounds.current) {
      hasFittedBounds.current = true
      setTimeout(() => {
        mapRef.current?.fitBounds(bounds, {
          padding: 50,
          duration: 1000,
        })
      }, 100)
    }
  }, [bounds, mapLoaded])

  // Fit bounds when new data is loaded
  useEffect(() => {
    if (bounds && mapRef.current) {
      hasFittedBounds.current = false
      mapRef.current.fitBounds(bounds, {
        padding: 50,
        duration: 1000,
      })
      hasFittedBounds.current = true
    }
  }, [bounds])

  // Update vehicle positions when time changes
  useEffect(() => {
    if (stopTimes.length > 0 && trips.length > 0 && stops.length > 0) {
      const positions = getVehiclePositions(
        stopTimes,
        trips,
        routes,
        stops,
        currentTimeSeconds
      )
      setVehiclePositions(positions)
    }
  }, [currentTimeSeconds, stopTimes, trips, routes, stops, setVehiclePositions])

  // Animation loop for playback
  useEffect(() => {
    if (!isPlaying) return

    let lastTime = performance.now()
    let animationId: number

    const animate = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 1000 // Convert to seconds
      lastTime = currentTime
      useTimetableStore.getState().incrementTime(delta * 60) // 1 real second = 1 simulated minute
      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [isPlaying])

  // Handle click on map features
  const handleClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const features = event.features
      if (!features || features.length === 0) {
        setPopupInfo(null)
        return
      }

      const feature = features[0]
      const { lng, lat } = event.lngLat

      if (feature.layer.id === 'stops-unclustered') {
        const props = feature.properties as Record<string, unknown>
        setPopupInfo({
          longitude: lng,
          latitude: lat,
          type: 'stop',
          properties: props,
        })
        setSelectedStop(props.stop_id as string)
      } else if (feature.layer.id === 'vehicles-points') {
        const props = feature.properties as Record<string, unknown>
        setPopupInfo({
          longitude: lng,
          latitude: lat,
          type: 'vehicle',
          properties: props,
        })
      } else if (feature.layer.id === 'stops-clusters') {
        // Zoom into cluster
        const clusterId = feature.properties?.cluster_id
        const source = mapRef.current?.getSource('stops')
        if (source && 'getClusterExpansionZoom' in source) {
          ;(source as unknown as { getClusterExpansionZoom: (id: number, cb: (err: Error | null, zoom: number) => void) => void })
            .getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (!err && mapRef.current) {
                mapRef.current.easeTo({
                  center: [lng, lat],
                  zoom,
                })
              }
            })
        }
      }
    },
    [setSelectedStop]
  )

  return (
    <MapGL
      ref={mapRef}
      initialViewState={INITIAL_VIEW_STATE}
      mapStyle={MAP_STYLE}
      style={{ width: '100%', height: '100%' }}
      interactiveLayerIds={['stops-unclustered', 'stops-clusters', 'vehicles-points']}
      onClick={handleClick}
      onLoad={handleMapLoad}
    >
      <NavigationControl position="top-right" />
      <ScaleControl position="bottom-right" />

      {shapesGeoJson && (
        <ShapesLayer
          data={shapesGeoJson}
          visible={layerVisibility.shapes}
          selectedRouteIds={selectedRouteIds}
          selectedRouteTypes={selectedRouteTypes}
        />
      )}

      {filteredStopsGeoJson && (
        <StopsLayer data={filteredStopsGeoJson} visible={layerVisibility.stops} />
      )}

      <VehiclesLayer
        positions={vehiclePositions}
        visible={layerVisibility.vehicles}
      />

      {popupInfo && (
        <Popup
          longitude={popupInfo.longitude}
          latitude={popupInfo.latitude}
          anchor="bottom"
          onClose={() => setPopupInfo(null)}
          closeButton={true}
          closeOnClick={false}
        >
          {popupInfo.type === 'stop' && (
            <div className="p-2 min-w-48">
              <h3 className="font-bold text-sm mb-2">
                {String(popupInfo.properties.stop_name)}
              </h3>
              <div className="text-xs space-y-1 text-gray-600">
                <p><span className="font-medium">ID:</span> {String(popupInfo.properties.stop_id)}</p>
                {popupInfo.properties.stop_code ? (
                  <p><span className="font-medium">Code:</span> {String(popupInfo.properties.stop_code)}</p>
                ) : null}
                <p>
                  <span className="font-medium">Coords:</span>{' '}
                  {Number(popupInfo.properties.stop_lat)?.toFixed(6)},{' '}
                  {Number(popupInfo.properties.stop_lon)?.toFixed(6)}
                </p>
                {popupInfo.properties.zone_id ? (
                  <p><span className="font-medium">Zone:</span> {String(popupInfo.properties.zone_id)}</p>
                ) : null}
                {popupInfo.properties.location_type !== undefined && (
                  <p>
                    <span className="font-medium">Type:</span>{' '}
                    {popupInfo.properties.location_type === 0
                      ? 'Stop'
                      : popupInfo.properties.location_type === 1
                        ? 'Station'
                        : String(popupInfo.properties.location_type)}
                  </p>
                )}
                {popupInfo.properties.parent_station ? (
                  <p><span className="font-medium">Parent:</span> {String(popupInfo.properties.parent_station)}</p>
                ) : null}
              </div>
            </div>
          )}
          {popupInfo.type === 'vehicle' && (
            <div className="p-2 min-w-48">
              <h3 className="font-bold text-sm mb-2">
                {popupInfo.properties.headsign ? String(popupInfo.properties.headsign) : `Trip ${String(popupInfo.properties.tripId)}`}
              </h3>
              <div className="text-xs space-y-1 text-gray-600">
                <p><span className="font-medium">Route:</span> {String(popupInfo.properties.routeId)}</p>
                <p><span className="font-medium">Trip:</span> {String(popupInfo.properties.tripId)}</p>
                <p><span className="font-medium">Next Stop:</span> {String(popupInfo.properties.nextStopId)}</p>
              </div>
            </div>
          )}
        </Popup>
      )}
    </MapGL>
  )
}

export default Map
