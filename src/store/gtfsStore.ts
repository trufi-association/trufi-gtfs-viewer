import { create } from 'zustand'
import type { FeatureCollection, Point, LineString } from 'geojson'
import type { GtfsStop, GtfsRoute, GtfsTrip, GtfsShape, GtfsStopTime, GtfsCalendar, GtfsFrequency, GtfsAgency, TrajectoryCache, TimeIndexedVehicles } from '../types/gtfs'
import type { StopProperties } from '../services/gtfs/stopsToGeoJson'
import type { ShapeProperties } from '../services/gtfs/shapesToGeoJson'
import { stopsToGeoJson, calculateBounds } from '../services/gtfs/stopsToGeoJson'
import { shapesToGeoJson } from '../services/gtfs/shapesToGeoJson'
import { parseGtfsFile, type GtfsInput } from '../services/gtfs/parser'
import { saveGtfsFile, saveGtfsFolder, loadGtfsFile, clearGtfsData } from '../services/storage/indexedDb'
import { precomputeTrajectories, buildTimeIndex } from '../services/gtfs/trajectoryPrecomputer'

interface GtfsState {
  // Raw parsed data
  stops: GtfsStop[]
  routes: GtfsRoute[]
  trips: GtfsTrip[]
  shapes: GtfsShape[]
  stopTimes: GtfsStopTime[]
  calendar: GtfsCalendar[]
  frequencies: GtfsFrequency[]
  agency: GtfsAgency[]

  // GeoJSON for map rendering
  stopsGeoJson: FeatureCollection<Point, StopProperties> | null
  shapesGeoJson: FeatureCollection<LineString, ShapeProperties> | null

  // Calculated bounds
  bounds: [[number, number], [number, number]] | null

  // Simulation optimization cache
  trajectoryCache: TrajectoryCache | null
  timeIndex: TimeIndexedVehicles | null

  // Feed metadata
  feedStats: {
    stopCount: number
    routeCount: number
    tripCount: number
    shapeCount: number
    agencyName?: string
  } | null

  // Loading state
  isLoading: boolean
  loadingProgress: number
  loadingMessage: string
  error: string | null

  // Actions
  loadGtfsFile: (input: GtfsInput) => Promise<void>
  loadFromStorage: () => Promise<boolean>
  clearData: () => Promise<void>
}

export const useGtfsStore = create<GtfsState>((set) => ({
  stops: [],
  routes: [],
  trips: [],
  shapes: [],
  stopTimes: [],
  calendar: [],
  frequencies: [],
  agency: [],
  stopsGeoJson: null,
  shapesGeoJson: null,
  bounds: null,
  trajectoryCache: null,
  timeIndex: null,
  feedStats: null,
  isLoading: false,
  loadingProgress: 0,
  loadingMessage: '',
  error: null,

  loadGtfsFile: async (input: GtfsInput) => {
    set({ isLoading: true, loadingProgress: 0, error: null })

    try {
      const data = await parseGtfsFile(input, (progress, message) => {
        set({ loadingProgress: progress, loadingMessage: message })
      })

      // Save to IndexedDB (ZIP files or folders converted to ZIP)
      set({ loadingMessage: 'Saving to local storage...' })
      if (Array.isArray(input)) {
        await saveGtfsFolder(input)
      } else {
        await saveGtfsFile(input)
      }

      // Convert to GeoJSON (pass stopTimes for origin/destination detection)
      const stopsGeoJson = stopsToGeoJson(data.stops, data.stopTimes)
      const shapesGeoJson = shapesToGeoJson(data.shapes, data.routes, data.trips)
      const bounds = calculateBounds(data.stops)

      // Pre-compute trajectories for simulation optimization
      set({ loadingMessage: 'Pre-calculando trayectorias...' })
      const trajectoryCache = precomputeTrajectories(
        data.shapes,
        data.trips,
        data.stopTimes,
        data.stops,
        (progress, message) => {
          // Scale progress from 0-100 to 85-98
          const scaledProgress = 85 + Math.floor(progress * 0.13)
          set({ loadingProgress: scaledProgress, loadingMessage: message })
        }
      )

      set({ loadingMessage: 'Construyendo índice temporal...' })
      const timeIndex = buildTimeIndex(
        trajectoryCache,
        data.trips,
        data.frequencies,
        data.routes,
        (progress, message) => {
          const scaledProgress = 98 + Math.floor(progress * 0.02)
          set({ loadingProgress: scaledProgress, loadingMessage: message })
        }
      )

      set({
        stops: data.stops,
        routes: data.routes,
        trips: data.trips,
        shapes: data.shapes,
        stopTimes: data.stopTimes,
        calendar: data.calendar,
        frequencies: data.frequencies,
        agency: data.agency,
        stopsGeoJson,
        shapesGeoJson,
        bounds,
        trajectoryCache,
        timeIndex,
        feedStats: {
          stopCount: data.stops.length,
          routeCount: data.routes.length,
          tripCount: data.trips.length,
          shapeCount: new Set(data.shapes.map((s) => s.shape_id)).size,
          agencyName: data.agency[0]?.agency_name,
        },
        isLoading: false,
        loadingProgress: 100,
        loadingMessage: 'Complete!',
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to parse GTFS file',
      })
    }
  },

  loadFromStorage: async () => {
    set({ isLoading: true, loadingProgress: 0, loadingMessage: 'Loading from local storage...', error: null })

    try {
      const file = await loadGtfsFile()
      if (!file) {
        set({ isLoading: false, loadingProgress: 0, loadingMessage: '' })
        return false
      }

      // Parse the GTFS file (this will re-analyze with current code)
      const data = await parseGtfsFile(file, (progress, message) => {
        set({ loadingProgress: progress, loadingMessage: message })
      })

      if (!data.stops || data.stops.length === 0) {
        set({ isLoading: false, loadingProgress: 0, loadingMessage: '' })
        return false
      }

      // Convert to GeoJSON (pass stopTimes for origin/destination detection)
      const stopsGeoJson = stopsToGeoJson(data.stops, data.stopTimes)
      const shapesGeoJson = shapesToGeoJson(data.shapes, data.routes, data.trips)
      const bounds = calculateBounds(data.stops)

      // Pre-compute trajectories for simulation optimization
      set({ loadingMessage: 'Pre-calculando trayectorias...' })
      const trajectoryCache = precomputeTrajectories(
        data.shapes,
        data.trips,
        data.stopTimes,
        data.stops,
        (progress, message) => {
          const scaledProgress = 85 + Math.floor(progress * 0.13)
          set({ loadingProgress: scaledProgress, loadingMessage: message })
        }
      )

      set({ loadingMessage: 'Construyendo índice temporal...' })
      const timeIndex = buildTimeIndex(
        trajectoryCache,
        data.trips,
        data.frequencies,
        data.routes,
        (progress, message) => {
          const scaledProgress = 98 + Math.floor(progress * 0.02)
          set({ loadingProgress: scaledProgress, loadingMessage: message })
        }
      )

      set({
        stops: data.stops,
        routes: data.routes,
        trips: data.trips,
        shapes: data.shapes,
        stopTimes: data.stopTimes,
        calendar: data.calendar,
        frequencies: data.frequencies,
        agency: data.agency,
        stopsGeoJson,
        shapesGeoJson,
        bounds,
        trajectoryCache,
        timeIndex,
        feedStats: {
          stopCount: data.stops.length,
          routeCount: data.routes.length,
          tripCount: data.trips.length,
          shapeCount: new Set(data.shapes.map((s) => s.shape_id)).size,
          agencyName: data.agency[0]?.agency_name,
        },
        isLoading: false,
        loadingProgress: 100,
        loadingMessage: 'Loaded from storage!',
      })
      return true
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load from storage',
      })
      return false
    }
  },

  clearData: async () => {
    await clearGtfsData()
    set({
      stops: [],
      routes: [],
      trips: [],
      shapes: [],
      stopTimes: [],
      calendar: [],
      frequencies: [],
      agency: [],
      stopsGeoJson: null,
      shapesGeoJson: null,
      bounds: null,
      trajectoryCache: null,
      timeIndex: null,
      feedStats: null,
      error: null,
    })
  },
}))
