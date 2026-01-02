import { useState } from 'react'
import { useGtfsStore } from '../../store/gtfsStore'
import { useUiStore } from '../../store/uiStore'
import DropZone from '../upload/DropZone'
import RouteList from './RouteList'
import AnalyticsPanel from './AnalyticsPanel'

export function Sidebar() {
  const { feedStats, clearData } = useGtfsStore()
  const { layerVisibility, setLayerVisibility } = useUiStore()
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showLayers, setShowLayers] = useState(false)

  return (
    <div className="sidebar-container">
      {/* Header */}
      <div className="header">
        <div className="header-content">
          <div className="header-brand">
            {/* Logo/Icon */}
            <div className="header-logo">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div>
              <h1 className="header-title">GTFS Viewer</h1>
              {feedStats?.agencyName && (
                <p className="header-subtitle">{feedStats.agencyName}</p>
              )}
            </div>
          </div>
          {feedStats && (
            <button
              onClick={clearData}
              className="btn btn-danger btn-icon"
              title="Close GTFS"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="sidebar-content">
        {/* Upload section */}
        {!feedStats && <DropZone />}

        {feedStats && (
          <>
            {/* GTFS Feed Info / Analytics Section */}
            <div className="section">
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="section-header"
              >
                <div className="section-title">
                  {/* GTFS Icon */}
                  <div className="section-icon gtfs-icon">
                    <span>GT</span>
                  </div>
                  <div>
                    <div className="section-label">Feed Info</div>
                    <div className="section-meta">{feedStats.routeCount} routes, {feedStats.stopCount.toLocaleString()} stops</div>
                  </div>
                </div>
                <svg
                  className={`section-chevron ${showAnalytics ? 'open' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showAnalytics && (
                <div className="section-content">
                  <AnalyticsPanel />
                </div>
              )}
            </div>

            {/* Layers Section */}
            <div className="section">
              <button
                onClick={() => setShowLayers(!showLayers)}
                className="section-header"
              >
                <div className="section-title">
                  <div className="section-icon layers-icon">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                  <div className="section-label">Map Layers</div>
                </div>
                <svg
                  className={`section-chevron ${showLayers ? 'open' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showLayers && (
                <div className="section-content">
                  <div className="layer-toggles">
                    <LayerToggle
                      active={layerVisibility.shapes}
                      onClick={() => setLayerVisibility('shapes', !layerVisibility.shapes)}
                      label="Routes"
                      description="Route shapes"
                      color="blue"
                    />
                    <LayerToggle
                      active={layerVisibility.stops}
                      onClick={() => setLayerVisibility('stops', !layerVisibility.stops)}
                      label="Stops"
                      description="Stop locations"
                      color="rose"
                    />
                    <LayerToggle
                      active={layerVisibility.vehicles}
                      onClick={() => setLayerVisibility('vehicles', !layerVisibility.vehicles)}
                      label="Vehicles"
                      description="Simulated positions"
                      color="emerald"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Route list with filters */}
            <RouteList />
          </>
        )}
      </div>
    </div>
  )
}

// Layer toggle component
function LayerToggle({
  active,
  onClick,
  label,
  description,
  color,
}: {
  active: boolean
  onClick: () => void
  label: string
  description: string
  color: 'blue' | 'rose' | 'emerald'
}) {
  return (
    <button
      onClick={onClick}
      className={`toggle ${active ? 'active' : ''}`}
    >
      <div>
        <div className="toggle-label">{label}</div>
        <div className="toggle-description">{description}</div>
      </div>
      <div className={`toggle-switch ${active ? `active active-${color === 'blue' ? '' : color === 'rose' ? 'warning' : 'success'}` : ''}`}>
        <div className="toggle-thumb" />
      </div>
    </button>
  )
}

export default Sidebar
