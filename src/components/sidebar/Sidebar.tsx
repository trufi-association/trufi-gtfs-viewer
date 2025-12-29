import { useGtfsStore } from '../../store/gtfsStore'
import DropZone from '../upload/DropZone'
import LayerControls from './LayerControls'
import RouteList from './RouteList'

export function Sidebar() {
  const { feedStats, clearData } = useGtfsStore()

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-800">GTFS Viewer</h1>
        {feedStats?.agencyName && (
          <p className="text-sm text-gray-500 mt-1">{feedStats.agencyName}</p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Upload section */}
        {!feedStats && <DropZone />}

        {/* Feed stats */}
        {feedStats && (
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-gray-700">Feed Info</h3>
              <button
                onClick={clearData}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Clear
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-gray-500 text-xs">Stops</div>
                <div className="font-semibold">{feedStats.stopCount.toLocaleString()}</div>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-gray-500 text-xs">Routes</div>
                <div className="font-semibold">{feedStats.routeCount.toLocaleString()}</div>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-gray-500 text-xs">Trips</div>
                <div className="font-semibold">{feedStats.tripCount.toLocaleString()}</div>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-gray-500 text-xs">Shapes</div>
                <div className="font-semibold">{feedStats.shapeCount.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}

        {/* Layer controls */}
        {feedStats && <LayerControls />}

        {/* Route list */}
        {feedStats && <RouteList />}
      </div>
    </div>
  )
}

export default Sidebar
