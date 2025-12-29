import { create } from 'zustand'
import type { VehiclePosition } from '../types/gtfs'

interface TimetableState {
  currentTimeSeconds: number
  isPlaying: boolean
  playbackSpeed: number
  selectedTripId: string | null
  vehiclePositions: VehiclePosition[]

  setCurrentTime: (seconds: number) => void
  setIsPlaying: (playing: boolean) => void
  togglePlayback: () => void
  setPlaybackSpeed: (speed: number) => void
  setSelectedTrip: (tripId: string | null) => void
  setVehiclePositions: (positions: VehiclePosition[]) => void
  incrementTime: (deltaSeconds: number) => void
}

// Default to 8:00 AM
const DEFAULT_TIME = 8 * 3600

export const useTimetableStore = create<TimetableState>((set) => ({
  currentTimeSeconds: DEFAULT_TIME,
  isPlaying: false,
  playbackSpeed: 1,
  selectedTripId: null,
  vehiclePositions: [],

  setCurrentTime: (seconds) => {
    // Wrap around at 24 hours (86400 seconds)
    const wrappedSeconds = ((seconds % 86400) + 86400) % 86400
    set({ currentTimeSeconds: wrappedSeconds })
  },

  setIsPlaying: (playing) => set({ isPlaying: playing }),

  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  setSelectedTrip: (tripId) => set({ selectedTripId: tripId }),

  setVehiclePositions: (positions) => set({ vehiclePositions: positions }),

  incrementTime: (deltaSeconds) =>
    set((state) => {
      const newTime = state.currentTimeSeconds + deltaSeconds * state.playbackSpeed
      // Wrap around at 24 hours
      const wrappedTime = ((newTime % 86400) + 86400) % 86400
      return { currentTimeSeconds: wrappedTime }
    }),
}))
