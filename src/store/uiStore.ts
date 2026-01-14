import { create } from 'zustand'

interface LayerVisibility {
  stops: boolean
  shapes: boolean
  vehicles: boolean
  stopArrows: boolean
}

interface UiState {
  sidebarOpen: boolean
  layerVisibility: LayerVisibility
  selectedRouteIds: Set<string>
  selectedRouteTypes: Set<number>
  selectedTripIds: Set<string>
  expandedRouteId: string | null
  selectedStopId: string | null
  searchQuery: string

  toggleSidebar: () => void
  setLayerVisibility: (layer: keyof LayerVisibility, visible: boolean) => void
  toggleRouteSelection: (routeId: string) => void
  clearRouteSelection: () => void
  toggleRouteType: (routeType: number) => void
  clearRouteTypeFilter: () => void
  toggleTripSelection: (tripId: string) => void
  setSelectedTrips: (tripIds: Set<string>) => void
  clearTripSelection: () => void
  setExpandedRoute: (routeId: string | null) => void
  setSelectedStop: (stopId: string | null) => void
  setSearchQuery: (query: string) => void
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  layerVisibility: {
    stops: true,
    shapes: true,
    vehicles: true,
    stopArrows: false,
  },
  selectedRouteIds: new Set<string>(),
  selectedRouteTypes: new Set<number>(),
  selectedTripIds: new Set<string>(),
  expandedRouteId: null,
  selectedStopId: null,
  searchQuery: '',

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setLayerVisibility: (layer, visible) =>
    set((state) => ({
      layerVisibility: { ...state.layerVisibility, [layer]: visible },
    })),

  toggleRouteSelection: (routeId) =>
    set((state) => {
      const newSet = new Set(state.selectedRouteIds)
      if (newSet.has(routeId)) {
        newSet.delete(routeId)
      } else {
        newSet.add(routeId)
      }
      // Don't clear trip selection here - managed by Layout component
      return { selectedRouteIds: newSet }
    }),

  clearRouteSelection: () => set({ selectedRouteIds: new Set(), selectedTripIds: new Set() }),

  toggleRouteType: (routeType) =>
    set((state) => {
      const newSet = new Set(state.selectedRouteTypes)
      if (newSet.has(routeType)) {
        newSet.delete(routeType)
      } else {
        newSet.add(routeType)
      }
      return { selectedRouteTypes: newSet }
    }),

  clearRouteTypeFilter: () => set({ selectedRouteTypes: new Set() }),

  toggleTripSelection: (tripId) =>
    set((state) => {
      const newSet = new Set(state.selectedTripIds)
      if (newSet.has(tripId)) {
        newSet.delete(tripId)
      } else {
        newSet.add(tripId)
      }
      return { selectedTripIds: newSet }
    }),

  setSelectedTrips: (tripIds) => set({ selectedTripIds: tripIds }),

  clearTripSelection: () => set({ selectedTripIds: new Set() }),

  setExpandedRoute: (routeId) => set({ expandedRouteId: routeId }),

  setSelectedStop: (stopId) => set({ selectedStopId: stopId }),

  setSearchQuery: (query) => set({ searchQuery: query }),
}))
