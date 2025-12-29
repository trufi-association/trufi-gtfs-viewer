import { useMemo, useState } from 'react'
import { useGtfsStore } from '../../store/gtfsStore'
import { useUiStore } from '../../store/uiStore'
import { ROUTE_TYPES } from '../../types/gtfs'

export function RouteList() {
  const { routes } = useGtfsStore()
  const {
    selectedRouteIds,
    selectedRouteTypes,
    toggleRouteSelection,
    toggleRouteType,
    clearRouteSelection,
    clearRouteTypeFilter,
    searchQuery,
    setSearchQuery,
  } = useUiStore()

  const [isExpanded, setIsExpanded] = useState(true)

  // Get unique route types from data
  const availableRouteTypes = useMemo(() => {
    const types = new Set(routes.map((r) => r.route_type))
    return Array.from(types).sort((a, b) => a - b)
  }, [routes])

  // Filter routes based on search and route type
  const filteredRoutes = useMemo(() => {
    const query = searchQuery.toLowerCase()
    return routes.filter((route) => {
      const shortName = String(route.route_short_name ?? '').toLowerCase()
      const longName = String(route.route_long_name ?? '').toLowerCase()
      const routeId = String(route.route_id).toLowerCase()

      const matchesSearch =
        !searchQuery ||
        shortName.includes(query) ||
        longName.includes(query) ||
        routeId.includes(query)

      const matchesType =
        selectedRouteTypes.size === 0 || selectedRouteTypes.has(route.route_type)

      return matchesSearch && matchesType
    })
  }, [routes, searchQuery, selectedRouteTypes])

  if (routes.length === 0) return null

  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
      >
        <h3 className="font-semibold text-sm text-gray-700">
          Routes ({routes.length})
        </h3>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Search routes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Route type filters */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Filter by type</span>
              {selectedRouteTypes.size > 0 && (
                <button
                  onClick={clearRouteTypeFilter}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {availableRouteTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleRouteType(type)}
                  className={`px-2 py-1 text-xs rounded-full transition-colors ${
                    selectedRouteTypes.has(type)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {ROUTE_TYPES[type] || `Type ${type}`}
                </button>
              ))}
            </div>
          </div>

          {/* Selected routes indicator */}
          {selectedRouteIds.size > 0 && (
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="text-gray-500">{selectedRouteIds.size} selected</span>
              <button
                onClick={clearRouteSelection}
                className="text-blue-600 hover:text-blue-800"
              >
                Clear selection
              </button>
            </div>
          )}

          {/* Route list */}
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredRoutes.map((route) => {
              const colorStr = String(route.route_color ?? '')
              const color = colorStr
                ? colorStr.startsWith('#')
                  ? colorStr
                  : `#${colorStr}`
                : '#3388ff'
              const isSelected = selectedRouteIds.has(route.route_id)

              return (
                <button
                  key={route.route_id}
                  onClick={() => toggleRouteSelection(route.route_id)}
                  className={`w-full flex items-center gap-2 p-2 rounded text-left text-sm transition-colors ${
                    isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-800 truncate">
                      {route.route_short_name || route.route_id}
                    </div>
                    {route.route_long_name && (
                      <div className="text-xs text-gray-500 truncate">
                        {route.route_long_name}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {ROUTE_TYPES[route.route_type] || route.route_type}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default RouteList
