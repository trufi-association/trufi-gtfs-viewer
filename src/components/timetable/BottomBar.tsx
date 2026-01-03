import { useMemo } from 'react'
import { useTimetableStore } from '../../store/timetableStore'
import { useGtfsStore } from '../../store/gtfsStore'
import { formatTime } from '../../services/gtfs/vehicleInterpolator'

interface BottomBarProps {
  onAnalyticsClick: () => void
}

export function BottomBar({ onAnalyticsClick }: BottomBarProps) {
  const { feedStats, routes, trips, stopTimes, stops, calendar } = useGtfsStore()
  const {
    currentTimeSeconds,
    isPlaying,
    playbackSpeed,
    filteredVehicleCount,
    setCurrentTime,
    togglePlayback,
    setPlaybackSpeed,
  } = useTimetableStore()

  // Calculate overall score
  const overallScore = useMemo(() => {
    if (!feedStats) return null

    const routesWithShapes = new Set(trips.filter(t => t.shape_id).map(t => t.route_id)).size
    const shapesCoverage = routes.length > 0 ? Math.round((routesWithShapes / routes.length) * 100) : 0

    const stopsWithCoords = stops.filter(s => s.stop_lat && s.stop_lon).length
    const stopsCoordsCoverage = stops.length > 0 ? Math.round((stopsWithCoords / stops.length) * 100) : 0

    const tripsWithStops = new Set(stopTimes.map(st => st.trip_id))
    const tripsCoverage = trips.length > 0 ? Math.round((tripsWithStops.size / trips.length) * 100) : 0

    const stopsWithNames = stops.filter(s => s.stop_name && s.stop_name.trim()).length
    const namesCoverage = stops.length > 0 ? Math.round((stopsWithNames / stops.length) * 100) : 0

    const calendarCoverage = calendar.length > 0 ? 100 : 0

    const scores = [shapesCoverage, stopsCoordsCoverage, tripsCoverage, namesCoverage, calendarCoverage]
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }, [feedStats, routes, trips, stopTimes, stops, calendar])

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'var(--success)'
    if (score >= 50) return 'var(--warning)'
    return 'var(--danger)'
  }

  if (!feedStats) return null

  const speeds = [1, 2, 5, 10, 30, 60]

  return (
    <div className="bottom-bar">
      {/* Play/Pause button */}
      <button
        onClick={togglePlayback}
        className={`play-btn ${isPlaying ? 'playing' : ''}`}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Time display */}
      <div className="time-display">
        {formatTime(Math.floor(currentTimeSeconds))}
      </div>

      {/* Vehicle count badge */}
      <div className="vehicle-badge">
        <span className="vehicle-dot"></span>
        <span>{filteredVehicleCount}</span>
      </div>

      {/* Slider section */}
      <div className="slider-section">
        <input
          type="range"
          min={0}
          max={86400}
          step={60}
          value={currentTimeSeconds}
          onChange={(e) => setCurrentTime(Number(e.target.value))}
        />
        <div className="slider-markers">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>
      </div>

      {/* Speed buttons */}
      <div className="speed-btns">
        {speeds.map((speed) => (
          <button
            key={speed}
            onClick={() => setPlaybackSpeed(speed)}
            className={playbackSpeed === speed ? 'active' : ''}
          >
            {speed}x
          </button>
        ))}
      </div>

      {/* Analytics button */}
      {overallScore !== null && (
        <button
          className="analytics-btn"
          onClick={onAnalyticsClick}
          aria-label="Open quality report"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span
            className="analytics-score"
            style={{ color: getScoreColor(overallScore) }}
          >
            {overallScore}%
          </span>
        </button>
      )}
    </div>
  )
}

export default BottomBar
