import { useState } from 'react'
import { useGtfsStore } from '../../store/gtfsStore'
import { useUiStore } from '../../store/uiStore'
import DropZone from '../upload/DropZone'
import RouteList from './RouteList'

export function Sidebar() {
  const { feedStats, clearData } = useGtfsStore()
  const { layerVisibility, setLayerVisibility } = useUiStore()
  const [showLayers, setShowLayers] = useState(true)

  return (
    <div className="sidebar-container">
      {/* Header */}
      <div className="header">
        <div className="header-content">
          <div className="header-brand">
            {/* Logo/Icon - Bus icon */}
            <div className="header-logo">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h.01M16 17h.01M9 12h6M4 8h16M5 8V6a2 2 0 012-2h10a2 2 0 012 2v2M5 8v9a2 2 0 002 2h10a2 2 0 002-2V8" />
              </svg>
            </div>
            <div>
              <h1 className="header-title">GTFS Simulator</h1>
              {feedStats?.agencyName && (
                <p className="header-subtitle">{feedStats.agencyName}</p>
              )}
            </div>
          </div>
          {feedStats && (
            <button
              onClick={clearData}
              className="btn btn-danger btn-icon"
              title="Close GTFS feed"
              aria-label="Close GTFS feed"
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
            {/* Feed Stats - Compact bar */}
            <div className="feed-stats-bar">
              <div className="feed-stat-item">
                <span className="feed-stat-value">{feedStats.routeCount}</span>
                <span className="feed-stat-label">Routes</span>
              </div>
              <div className="feed-stat-divider" />
              <div className="feed-stat-item">
                <span className="feed-stat-value">{feedStats.stopCount.toLocaleString()}</span>
                <span className="feed-stat-label">Stops</span>
              </div>
              <div className="feed-stat-divider" />
              <div className="feed-stat-item">
                <span className="feed-stat-value">{feedStats.tripCount.toLocaleString()}</span>
                <span className="feed-stat-label">Trips</span>
              </div>
              <div className="feed-stat-divider" />
              <div className="feed-stat-item">
                <span className="feed-stat-value">{feedStats.shapeCount}</span>
                <span className="feed-stat-label">Shapes</span>
              </div>
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
                      description="Route shapes & lines"
                      color="blue"
                      icon={
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      }
                    />
                    <LayerToggle
                      active={layerVisibility.stops}
                      onClick={() => setLayerVisibility('stops', !layerVisibility.stops)}
                      label="Stops"
                      description="Stop locations"
                      color="rose"
                      icon={
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      }
                    />
                    <LayerToggle
                      active={layerVisibility.vehicles}
                      onClick={() => setLayerVisibility('vehicles', !layerVisibility.vehicles)}
                      label="Vehicles"
                      description="Simulated positions"
                      color="emerald"
                      icon={
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h.01M16 17h.01M9 12h6M4 8h16M5 8V6a2 2 0 012-2h10a2 2 0 012 2v2M5 8v9a2 2 0 002 2h10a2 2 0 002-2V8" />
                        </svg>
                      }
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

// Layer toggle component with icons
function LayerToggle({
  active,
  onClick,
  label,
  description,
  color,
  icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  description: string
  color: 'blue' | 'rose' | 'emerald'
  icon: React.ReactNode
}) {
  const switchColor = color === 'blue' ? 'active' : color === 'rose' ? 'active active-warning' : 'active active-success'

  return (
    <button
      onClick={onClick}
      className={`toggle ${active ? 'active' : ''}`}
      aria-pressed={active}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: active ? (color === 'blue' ? 'rgba(59, 130, 246, 0.15)' : color === 'rose' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(34, 197, 94, 0.15)') : 'rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: active ? (color === 'blue' ? '#3b82f6' : color === 'rose' ? '#f43f5e' : '#22c55e') : '#737373',
          transition: 'all 200ms ease'
        }}>
          {icon}
        </div>
        <div>
          <div className="toggle-label">{label}</div>
          <div className="toggle-description">{description}</div>
        </div>
      </div>
      <div className={`toggle-switch ${active ? switchColor : ''}`}>
        <div className="toggle-thumb" />
      </div>
    </button>
  )
}

export default Sidebar
