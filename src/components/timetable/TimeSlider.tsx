import { useTimetableStore } from '../../store/timetableStore'
import { useGtfsStore } from '../../store/gtfsStore'
import { formatTime } from '../../services/gtfs/vehicleInterpolator'

export function TimeSlider() {
  const { feedStats } = useGtfsStore()
  const {
    currentTimeSeconds,
    isPlaying,
    playbackSpeed,
    filteredVehicleCount,
    setCurrentTime,
    togglePlayback,
    setPlaybackSpeed,
  } = useTimetableStore()


  if (!feedStats) return null

  const speeds = [1, 2, 5, 10, 30, 60]

  return (
    <div className="time-slider">
      <div className="time-controls">
        {/* Play/Pause button */}
        <button
          onClick={togglePlayback}
          className={`play-button ${isPlaying ? 'playing' : 'paused'}`}
        >
          {isPlaying ? (
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Current time display */}
        <div className="time-display">
          {formatTime(Math.floor(currentTimeSeconds))}
        </div>

        {/* Active vehicles count */}
        <div className="vehicle-count">
          <span className="pulse-dot">
            <span className="pulse-ring"></span>
            <span className="pulse-center"></span>
          </span>
          <span className="count-text">
            <strong>{filteredVehicleCount}</strong> vehicles
          </span>
        </div>

        {/* Speed selector */}
        <div className="speed-selector">
          {speeds.map((speed) => (
            <button
              key={speed}
              onClick={() => setPlaybackSpeed(speed)}
              className={`speed-button ${playbackSpeed === speed ? 'active' : 'inactive'}`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* Time slider */}
      <div className="slider-container">
        {/* Progress bar background */}
        <div className="slider-track">
          <div
            className="slider-progress"
            style={{ width: `${(currentTimeSeconds / 86400) * 100}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={86400}
          step={60}
          value={currentTimeSeconds}
          onChange={(e) => setCurrentTime(Number(e.target.value))}
        />
        {/* Time markers */}
        <div className="slider-markers">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>
      </div>
    </div>
  )
}

export default TimeSlider
