import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import MapGL, { NavigationControl, ScaleControl, Popup, MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useGtfsStore } from '../../store/gtfsStore'
import { useUiStore } from '../../store/uiStore'
import { useTimetableStore } from '../../store/timetableStore'
import StopsLayer from './StopsLayer'
import ShapesLayer from './ShapesLayer'
import VehiclesLayer from './VehiclesLayer'
import { getVehiclePositions, getVehiclePositionsOptimized } from '../../services/gtfs/vehicleInterpolator'
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

  const { stopsGeoJson, shapesGeoJson, bounds, stops, routes, trips, stopTimes, frequencies, trajectoryCache, timeIndex, calendar } =
    useGtfsStore()
  const { layerVisibility, selectedRouteIds, selectedRouteTypes, setSelectedStop } =
    useUiStore()
  const { currentTimeSeconds, selectedDate, isPlaying, vehiclePositions, setVehiclePositions, setFilteredVehicleCount } =
    useTimetableStore()

  // Calculate active service IDs for selected date
  const activeServiceIds = useMemo(() => {
    if (calendar.length === 0) return null // null means show all (no calendar filtering)

    const dayOfWeek = selectedDate.getDay()
    const dayFields = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
    const dateStr = `${selectedDate.getFullYear()}${String(selectedDate.getMonth() + 1).padStart(2, '0')}${String(selectedDate.getDate()).padStart(2, '0')}`

    const activeIds = new Set<string>()
    for (const cal of calendar) {
      const inRange = dateStr >= cal.start_date && dateStr <= cal.end_date
      const dayActive = cal[dayFields[dayOfWeek]] === 1
      if (inRange && dayActive) {
        activeIds.add(cal.service_id)
      }
    }

    return activeIds
  }, [calendar, selectedDate])

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

  // Calculate origin and destination stop IDs for selected routes
  const { originStopIds, destinationStopIds } = useMemo(() => {
    const origins = new Set<string>()
    const destinations = new Set<string>()

    if (selectedRouteIds.size === 0) {
      return { originStopIds: origins, destinationStopIds: destinations }
    }

    // Get trip IDs for selected routes
    const selectedTripIds = new Set(
      trips
        .filter((t) => selectedRouteIds.has(t.route_id))
        .map((t) => t.trip_id)
    )

    // Group stop times by trip
    const tripStopTimesMap: Record<string, typeof stopTimes> = {}
    for (const st of stopTimes) {
      if (selectedTripIds.has(st.trip_id)) {
        if (!tripStopTimesMap[st.trip_id]) {
          tripStopTimesMap[st.trip_id] = []
        }
        tripStopTimesMap[st.trip_id].push(st)
      }
    }

    // Find first and last stop of each trip
    for (const times of Object.values(tripStopTimesMap)) {
      if (times.length < 2) continue
      times.sort((a, b) => a.stop_sequence - b.stop_sequence)
      origins.add(times[0].stop_id)
      destinations.add(times[times.length - 1].stop_id)
    }

    return { originStopIds: origins, destinationStopIds: destinations }
  }, [selectedRouteIds, trips, stopTimes])

  // Filter vehicle positions based on selected routes
  const filteredVehiclePositions = useMemo(() => {
    if (selectedRouteIds.size === 0) return vehiclePositions // Show all if no route selected
    return vehiclePositions.filter((v) => selectedRouteIds.has(v.routeId))
  }, [vehiclePositions, selectedRouteIds])

  // Update filtered vehicle count in store
  useEffect(() => {
    setFilteredVehicleCount(filteredVehiclePositions.length)
  }, [filteredVehiclePositions.length, setFilteredVehicleCount])

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

  // Update vehicle positions when time changes (only when NOT playing)
  // During playback, the animation loop handles updates directly
  useEffect(() => {
    if (isPlaying) return // Skip during playback - animation loop handles it

    if (trajectoryCache && timeIndex) {
      const positions = getVehiclePositionsOptimized(
        trajectoryCache,
        timeIndex,
        currentTimeSeconds,
        activeServiceIds || undefined
      )
      setVehiclePositions(positions)
    } else if (stopTimes.length > 0 && trips.length > 0 && stops.length > 0) {
      const positions = getVehiclePositions(
        stopTimes,
        trips,
        routes,
        stops,
        frequencies,
        currentTimeSeconds
      )
      setVehiclePositions(positions)
    }
  }, [currentTimeSeconds, stopTimes, trips, routes, stops, frequencies, trajectoryCache, timeIndex, setVehiclePositions, isPlaying, activeServiceIds])

  // Keep activeServiceIds in a ref for animation loop access
  const activeServiceIdsRef = useRef(activeServiceIds)
  useEffect(() => {
    activeServiceIdsRef.current = activeServiceIds
  }, [activeServiceIds])

  // Animation loop for playback - uses requestAnimationFrame for smooth 60fps
  useEffect(() => {
    if (!isPlaying) return

    let animationId: number
    let lastTime = performance.now()

    const animate = (now: number) => {
      const delta = (now - lastTime) / 1000
      lastTime = now

      // Get current state directly to avoid stale closures
      const store = useTimetableStore.getState()
      const newTime = store.currentTimeSeconds + delta * store.playbackSpeed

      // Update time in store
      store.setCurrentTime(newTime)

      // Calculate positions directly here to avoid React re-render overhead
      const gtfsState = useGtfsStore.getState()
      if (gtfsState.trajectoryCache && gtfsState.timeIndex) {
        const positions = getVehiclePositionsOptimized(
          gtfsState.trajectoryCache,
          gtfsState.timeIndex,
          newTime,
          activeServiceIdsRef.current || undefined
        )
        store.setVehiclePositions(positions)
      }

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

      // Handle clicks on any stop layer (intermediate, origin, destination)
      if (feature.layer.id === 'stops-unclustered' ||
          feature.layer.id === 'stops-origin' ||
          feature.layer.id === 'stops-destination') {
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
      interactiveLayerIds={['stops-unclustered', 'stops-origin', 'stops-destination', 'vehicles-points']}
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
        <StopsLayer
          data={filteredStopsGeoJson}
          visible={layerVisibility.stops}
          originStopIds={originStopIds}
          destinationStopIds={destinationStopIds}
        />
      )}

      <VehiclesLayer
        positions={filteredVehiclePositions}
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
