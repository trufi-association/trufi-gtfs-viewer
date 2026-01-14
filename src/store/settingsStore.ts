import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Vehicle icon types
export type VehicleIconType = 'car' | 'bus' | 'minibus' | 'arrow'

// Stop icon types
export type StopIconType = 'circle' | 'square' | 'diamond' | 'pin'

// Terminal stop icon types (origin/destination)
export type TerminalIconType = 'circle' | 'square' | 'diamond' | 'pin' | 'flag' | 'star'

export interface MarkerSettings {
  // Vehicle settings
  vehicleIcon: VehicleIconType
  vehicleSize: number // 0.5 to 4.0 multiplier

  // Stop settings
  stopIcon: StopIconType
  stopSize: number // 0.5 to 4.0 multiplier

  // Origin stop settings
  originIcon: TerminalIconType
  originSize: number // 0.5 to 4.0 multiplier
  originColor: string // hex color

  // Destination stop settings
  destinationIcon: TerminalIconType
  destinationSize: number // 0.5 to 4.0 multiplier
  destinationColor: string // hex color

  // Shape/route line settings
  routeLineWidth: number // 1 to 15
}

interface SettingsState {
  markers: MarkerSettings
  settingsPanelOpen: boolean

  setVehicleIcon: (icon: VehicleIconType) => void
  setVehicleSize: (size: number) => void
  setStopIcon: (icon: StopIconType) => void
  setStopSize: (size: number) => void
  setOriginIcon: (icon: TerminalIconType) => void
  setOriginSize: (size: number) => void
  setOriginColor: (color: string) => void
  setDestinationIcon: (icon: TerminalIconType) => void
  setDestinationSize: (size: number) => void
  setDestinationColor: (color: string) => void
  setRouteLineWidth: (width: number) => void
  toggleSettingsPanel: () => void
  resetToDefaults: () => void
}

const defaultMarkers: MarkerSettings = {
  vehicleIcon: 'car',
  vehicleSize: 1.0,
  stopIcon: 'circle',
  stopSize: 1.0,
  originIcon: 'circle',
  originSize: 1.0,
  originColor: '#27ae60',
  destinationIcon: 'pin',
  destinationSize: 1.0,
  destinationColor: '#e74c3c',
  routeLineWidth: 3,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      markers: { ...defaultMarkers },
      settingsPanelOpen: false,

      setVehicleIcon: (icon) =>
        set((state) => ({
          markers: { ...state.markers, vehicleIcon: icon },
        })),

      setVehicleSize: (size) =>
        set((state) => ({
          markers: { ...state.markers, vehicleSize: Math.max(0.5, Math.min(4.0, size)) },
        })),

      setStopIcon: (icon) =>
        set((state) => ({
          markers: { ...state.markers, stopIcon: icon },
        })),

      setStopSize: (size) =>
        set((state) => ({
          markers: { ...state.markers, stopSize: Math.max(0.5, Math.min(4.0, size)) },
        })),

      setOriginIcon: (icon) =>
        set((state) => ({
          markers: { ...state.markers, originIcon: icon },
        })),

      setOriginSize: (size) =>
        set((state) => ({
          markers: { ...state.markers, originSize: Math.max(0.5, Math.min(4.0, size)) },
        })),

      setOriginColor: (color) =>
        set((state) => ({
          markers: { ...state.markers, originColor: color },
        })),

      setDestinationIcon: (icon) =>
        set((state) => ({
          markers: { ...state.markers, destinationIcon: icon },
        })),

      setDestinationSize: (size) =>
        set((state) => ({
          markers: { ...state.markers, destinationSize: Math.max(0.5, Math.min(4.0, size)) },
        })),

      setDestinationColor: (color) =>
        set((state) => ({
          markers: { ...state.markers, destinationColor: color },
        })),

      setRouteLineWidth: (width) =>
        set((state) => ({
          markers: { ...state.markers, routeLineWidth: Math.max(1, Math.min(15, width)) },
        })),

      toggleSettingsPanel: () =>
        set((state) => ({ settingsPanelOpen: !state.settingsPanelOpen })),

      resetToDefaults: () =>
        set({ markers: { ...defaultMarkers } }),
    }),
    {
      name: 'gtfs-viewer-settings',
      partialize: (state) => ({ markers: state.markers }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as { markers?: Partial<MarkerSettings> }
        return {
          ...currentState,
          markers: {
            ...defaultMarkers,
            ...(persisted?.markers || {}),
          },
        }
      },
    }
  )
)
