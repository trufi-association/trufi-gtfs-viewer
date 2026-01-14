import { useSettingsStore, VehicleIconType, StopIconType, TerminalIconType } from '../../store/settingsStore'

// Vehicle icon previews
const vehicleIcons: { type: VehicleIconType; label: string; svg: React.ReactNode }[] = [
  {
    type: 'car',
    label: 'Car',
    svg: (
      <svg viewBox="0 0 16 28" width="20" height="28">
        <path d="M3 6 L3 22 Q3 24 5 24 L11 24 Q13 24 13 22 L13 6 Q13 3 8 2 Q3 3 3 6 Z" fill="currentColor" stroke="#fff" strokeWidth="1"/>
        <path d="M5 7 Q8 5.5 11 7 L11 10 Q8 9 5 10 Z" fill="#fff" opacity="0.8"/>
        <path d="M5 18 Q8 19 11 18 L11 21 Q8 20.5 5 21 Z" fill="#fff" opacity="0.6"/>
      </svg>
    ),
  },
  {
    type: 'bus',
    label: 'Bus',
    svg: (
      <svg viewBox="0 0 20 32" width="20" height="32">
        <rect x="2" y="2" width="16" height="28" rx="3" fill="currentColor" stroke="#fff" strokeWidth="1"/>
        <rect x="4" y="4" width="12" height="6" rx="1" fill="#fff" opacity="0.8"/>
        <rect x="4" y="22" width="12" height="4" rx="1" fill="#fff" opacity="0.6"/>
        <circle cx="5" cy="28" r="1.5" fill="#333"/>
        <circle cx="15" cy="28" r="1.5" fill="#333"/>
      </svg>
    ),
  },
  {
    type: 'minibus',
    label: 'Minibus',
    svg: (
      <svg viewBox="0 0 18 26" width="18" height="26">
        <rect x="2" y="2" width="14" height="22" rx="4" fill="currentColor" stroke="#fff" strokeWidth="1"/>
        <rect x="4" y="4" width="10" height="5" rx="1" fill="#fff" opacity="0.8"/>
        <rect x="4" y="18" width="10" height="3" rx="1" fill="#fff" opacity="0.6"/>
      </svg>
    ),
  },
  {
    type: 'arrow',
    label: 'Arrow',
    svg: (
      <svg viewBox="0 0 20 20" width="20" height="20">
        <path d="M10 2 L18 18 L10 14 L2 18 Z" fill="currentColor" stroke="#fff" strokeWidth="1"/>
      </svg>
    ),
  },
]

// Stop icon previews
const stopIcons: { type: StopIconType; label: string; svg: React.ReactNode }[] = [
  {
    type: 'circle',
    label: 'Circle',
    svg: (
      <svg viewBox="0 0 20 20" width="20" height="20">
        <circle cx="10" cy="10" r="7" fill="currentColor" stroke="#fff" strokeWidth="2"/>
      </svg>
    ),
  },
  {
    type: 'square',
    label: 'Square',
    svg: (
      <svg viewBox="0 0 20 20" width="20" height="20">
        <rect x="3" y="3" width="14" height="14" rx="2" fill="currentColor" stroke="#fff" strokeWidth="2"/>
      </svg>
    ),
  },
  {
    type: 'diamond',
    label: 'Diamond',
    svg: (
      <svg viewBox="0 0 20 20" width="20" height="20">
        <path d="M10 2 L18 10 L10 18 L2 10 Z" fill="currentColor" stroke="#fff" strokeWidth="2"/>
      </svg>
    ),
  },
  {
    type: 'pin',
    label: 'Pin',
    svg: (
      <svg viewBox="0 0 20 24" width="20" height="24">
        <path d="M10 0 C4.5 0 0 4.5 0 10 C0 17.5 10 24 10 24 C10 24 20 17.5 20 10 C20 4.5 15.5 0 10 0 Z" fill="currentColor" stroke="#fff" strokeWidth="1"/>
        <circle cx="10" cy="10" r="4" fill="#fff"/>
      </svg>
    ),
  },
]

// Terminal icon previews (for origin/destination)
const terminalIcons: { type: TerminalIconType; label: string; svg: React.ReactNode }[] = [
  {
    type: 'circle',
    label: 'Circle',
    svg: (
      <svg viewBox="0 0 20 20" width="20" height="20">
        <circle cx="10" cy="10" r="7" fill="currentColor" stroke="#fff" strokeWidth="2"/>
      </svg>
    ),
  },
  {
    type: 'square',
    label: 'Square',
    svg: (
      <svg viewBox="0 0 20 20" width="20" height="20">
        <rect x="3" y="3" width="14" height="14" rx="2" fill="currentColor" stroke="#fff" strokeWidth="2"/>
      </svg>
    ),
  },
  {
    type: 'diamond',
    label: 'Diamond',
    svg: (
      <svg viewBox="0 0 20 20" width="20" height="20">
        <path d="M10 2 L18 10 L10 18 L2 10 Z" fill="currentColor" stroke="#fff" strokeWidth="2"/>
      </svg>
    ),
  },
  {
    type: 'pin',
    label: 'Pin',
    svg: (
      <svg viewBox="0 0 20 24" width="20" height="24">
        <path d="M10 0 C4.5 0 0 4.5 0 10 C0 17.5 10 24 10 24 C10 24 20 17.5 20 10 C20 4.5 15.5 0 10 0 Z" fill="currentColor" stroke="#fff" strokeWidth="1"/>
        <circle cx="10" cy="10" r="4" fill="#fff"/>
      </svg>
    ),
  },
  {
    type: 'flag',
    label: 'Flag',
    svg: (
      <svg viewBox="0 0 20 24" width="20" height="24">
        <rect x="3" y="0" width="2" height="24" fill="currentColor"/>
        <path d="M5 2 L18 2 L14 7 L18 12 L5 12 Z" fill="currentColor" stroke="#fff" strokeWidth="1"/>
      </svg>
    ),
  },
  {
    type: 'star',
    label: 'Star',
    svg: (
      <svg viewBox="0 0 20 20" width="20" height="20">
        <path d="M10 1 L12.5 7.5 L19 8 L14 12.5 L15.5 19 L10 15.5 L4.5 19 L6 12.5 L1 8 L7.5 7.5 Z" fill="currentColor" stroke="#fff" strokeWidth="1"/>
      </svg>
    ),
  },
]

export function SettingsPanel() {
  const {
    markers,
    settingsPanelOpen,
    setVehicleIcon,
    setVehicleSize,
    setStopIcon,
    setStopSize,
    setOriginIcon,
    setOriginSize,
    setOriginColor,
    setDestinationIcon,
    setDestinationSize,
    setDestinationColor,
    setRouteLineWidth,
    toggleSettingsPanel,
    resetToDefaults,
  } = useSettingsStore()

  if (!settingsPanelOpen) return null

  return (
    <div className="settings-overlay" onClick={toggleSettingsPanel}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Marker Settings</h2>
          <button onClick={toggleSettingsPanel} className="settings-close">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="settings-content">
          {/* Vehicle Settings */}
          <div className="settings-section">
            <h3>Vehicles</h3>

            <div className="settings-row">
              <label>Icon</label>
              <div className="icon-selector">
                {vehicleIcons.map((icon) => (
                  <button
                    key={icon.type}
                    className={`icon-option ${markers.vehicleIcon === icon.type ? 'selected' : ''}`}
                    onClick={() => setVehicleIcon(icon.type)}
                    title={icon.label}
                  >
                    <span className="icon-preview">{icon.svg}</span>
                    <span className="icon-label">{icon.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-row">
              <label>Size: {markers.vehicleSize.toFixed(1)}x</label>
              <input
                type="range"
                min="0.5"
                max="4.0"
                step="0.1"
                value={markers.vehicleSize}
                onChange={(e) => setVehicleSize(parseFloat(e.target.value))}
                className="settings-slider"
              />
            </div>
          </div>

          {/* Stop Settings */}
          <div className="settings-section">
            <h3>Stops</h3>

            <div className="settings-row">
              <label>Icon</label>
              <div className="icon-selector">
                {stopIcons.map((icon) => (
                  <button
                    key={icon.type}
                    className={`icon-option ${markers.stopIcon === icon.type ? 'selected' : ''}`}
                    onClick={() => setStopIcon(icon.type)}
                    title={icon.label}
                  >
                    <span className="icon-preview">{icon.svg}</span>
                    <span className="icon-label">{icon.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-row">
              <label>Stop size: {markers.stopSize.toFixed(1)}x</label>
              <input
                type="range"
                min="0.5"
                max="4.0"
                step="0.1"
                value={markers.stopSize}
                onChange={(e) => setStopSize(parseFloat(e.target.value))}
                className="settings-slider"
              />
            </div>
          </div>

          {/* Origin Stop Settings */}
          <div className="settings-section">
            <h3>Origin Stops</h3>

            <div className="settings-row">
              <label>Icon</label>
              <div className="icon-selector">
                {terminalIcons.map((icon) => (
                  <button
                    key={icon.type}
                    className={`icon-option ${markers.originIcon === icon.type ? 'selected' : ''}`}
                    onClick={() => setOriginIcon(icon.type)}
                    title={icon.label}
                    style={{ color: markers.originColor }}
                  >
                    <span className="icon-preview">{icon.svg}</span>
                    <span className="icon-label">{icon.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-row">
              <label>Size: {markers.originSize.toFixed(1)}x</label>
              <input
                type="range"
                min="0.5"
                max="4.0"
                step="0.1"
                value={markers.originSize}
                onChange={(e) => setOriginSize(parseFloat(e.target.value))}
                className="settings-slider"
              />
            </div>

            <div className="settings-row">
              <label>Color</label>
              <input
                type="color"
                value={markers.originColor}
                onChange={(e) => setOriginColor(e.target.value)}
                className="settings-color-picker"
              />
            </div>
          </div>

          {/* Destination Stop Settings */}
          <div className="settings-section">
            <h3>Destination Stops</h3>

            <div className="settings-row">
              <label>Icon</label>
              <div className="icon-selector">
                {terminalIcons.map((icon) => (
                  <button
                    key={icon.type}
                    className={`icon-option ${markers.destinationIcon === icon.type ? 'selected' : ''}`}
                    onClick={() => setDestinationIcon(icon.type)}
                    title={icon.label}
                    style={{ color: markers.destinationColor }}
                  >
                    <span className="icon-preview">{icon.svg}</span>
                    <span className="icon-label">{icon.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-row">
              <label>Size: {markers.destinationSize.toFixed(1)}x</label>
              <input
                type="range"
                min="0.5"
                max="4.0"
                step="0.1"
                value={markers.destinationSize}
                onChange={(e) => setDestinationSize(parseFloat(e.target.value))}
                className="settings-slider"
              />
            </div>

            <div className="settings-row">
              <label>Color</label>
              <input
                type="color"
                value={markers.destinationColor}
                onChange={(e) => setDestinationColor(e.target.value)}
                className="settings-color-picker"
              />
            </div>
          </div>

          {/* Route Line Settings */}
          <div className="settings-section">
            <h3>Route Lines</h3>

            <div className="settings-row">
              <label>Line width: {markers.routeLineWidth}px</label>
              <input
                type="range"
                min="1"
                max="15"
                step="1"
                value={markers.routeLineWidth}
                onChange={(e) => setRouteLineWidth(parseInt(e.target.value))}
                className="settings-slider"
              />
            </div>
          </div>

          {/* Reset Button */}
          <div className="settings-footer">
            <button onClick={resetToDefaults} className="btn btn-secondary">
              Reset to defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel
