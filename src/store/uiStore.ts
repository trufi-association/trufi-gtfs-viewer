import { create } from 'zustand'

interface LayerVisibility {
  stops: boolean
  shapes: boolean
  vehicles: boolean
}

interface UiState {
  sidebarOpen: boolean
  layerVisibility: LayerVisibility
  selectedRouteIds: Set<string>
  selectedRouteTypes: Set<number>
  selectedStopId: string | null
  searchQuery: string

  toggleSidebar: () => void
  setLayerVisibility: (layer: keyof LayerVisibility, visible: boolean) => void
  toggleRouteSelection: (routeId: string) => void
  clearRouteSelection: () => void
  toggleRouteType: (routeType: number) => void
  clearRouteTypeFilter: () => void
  setSelectedStop: (stopId: string | null) => void
  setSearchQuery: (query: string) => void
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  layerVisibility: {
    stops: true,
    shapes: true,
    vehicles: true,
  },
  selectedRouteIds: new Set<string>(),
  selectedRouteTypes: new Set<number>(),
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
      return { selectedRouteIds: newSet }
    }),

  clearRouteSelection: () => set({ selectedRouteIds: new Set() }),

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

  setSelectedStop: (stopId) => set({ selectedStopId: stopId }),

  setSearchQuery: (query) => set({ searchQuery: query }),
}))
