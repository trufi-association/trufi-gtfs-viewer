import { create } from 'zustand'
import type { VehiclePosition } from '../types/gtfs'

interface TimetableState {
  currentTimeSeconds: number
  selectedDate: Date
  isPlaying: boolean
  playbackSpeed: number
  selectedTripId: string | null
  vehiclePositions: VehiclePosition[]
  filteredVehicleCount: number

  setCurrentTime: (seconds: number) => void
  setSelectedDate: (date: Date) => void
  setIsPlaying: (playing: boolean) => void
  togglePlayback: () => void
  setPlaybackSpeed: (speed: number) => void
  setSelectedTrip: (tripId: string | null) => void
  setVehiclePositions: (positions: VehiclePosition[]) => void
  setFilteredVehicleCount: (count: number) => void
  incrementTime: (deltaSeconds: number) => void
  nextDay: () => void
  prevDay: () => void
}

// Default to 8:00 AM
const DEFAULT_TIME = 8 * 3600

export const useTimetableStore = create<TimetableState>((set) => ({
  currentTimeSeconds: DEFAULT_TIME,
  selectedDate: new Date(),
  isPlaying: false,
  playbackSpeed: 1,
  selectedTripId: null,
  vehiclePositions: [],
  filteredVehicleCount: 0,

  setCurrentTime: (seconds) => {
    // Wrap around at 24 hours (86400 seconds)
    const wrappedSeconds = ((seconds % 86400) + 86400) % 86400
    set({ currentTimeSeconds: wrappedSeconds })
  },

  setSelectedDate: (date) => set({ selectedDate: date }),

  setIsPlaying: (playing) => set({ isPlaying: playing }),

  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  setSelectedTrip: (tripId) => set({ selectedTripId: tripId }),

  setVehiclePositions: (positions) => set({ vehiclePositions: positions }),

  setFilteredVehicleCount: (count) => set({ filteredVehicleCount: count }),

  incrementTime: (deltaSeconds) =>
    set((state) => {
      const newTime = state.currentTimeSeconds + deltaSeconds * state.playbackSpeed
      // Wrap around at 24 hours
      const wrappedTime = ((newTime % 86400) + 86400) % 86400
      return { currentTimeSeconds: wrappedTime }
    }),

  nextDay: () =>
    set((state) => {
      const next = new Date(state.selectedDate)
      next.setDate(next.getDate() + 1)
      return { selectedDate: next }
    }),

  prevDay: () =>
    set((state) => {
      const prev = new Date(state.selectedDate)
      prev.setDate(prev.getDate() - 1)
      return { selectedDate: prev }
    }),
}))
