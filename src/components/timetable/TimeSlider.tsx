import { useEffect } from 'react'
import { useTimetableStore } from '../../store/timetableStore'
import { useGtfsStore } from '../../store/gtfsStore'
import { formatTime, parseGtfsTime } from '../../services/gtfs/vehicleInterpolator'

export function TimeSlider() {
  const { feedStats, stopTimes } = useGtfsStore()
  const {
    currentTimeSeconds,
    isPlaying,
    playbackSpeed,
    vehiclePositions,
    setCurrentTime,
    togglePlayback,
    setPlaybackSpeed,
  } = useTimetableStore()

  // Debug: log stop times info and find time range
  useEffect(() => {
    if (stopTimes.length > 0) {
      const sample = stopTimes.slice(0, 3)
      console.log('Sample stop_times:', sample)
      console.log('Sample parsed times:', sample.map(st => ({
        arrival: st.arrival_time,
        departure: st.departure_time,
        parsedArrival: parseGtfsTime(st.arrival_time),
        parsedDeparture: parseGtfsTime(st.departure_time),
      })))

      // Find time range in the data
      let minTime = Infinity
      let maxTime = -Infinity
      for (const st of stopTimes) {
        const arrTime = parseGtfsTime(st.arrival_time)
        const depTime = parseGtfsTime(st.departure_time)
        if (arrTime > 0) {
          minTime = Math.min(minTime, arrTime)
          maxTime = Math.max(maxTime, arrTime)
        }
        if (depTime > 0) {
          minTime = Math.min(minTime, depTime)
          maxTime = Math.max(maxTime, depTime)
        }
      }
      console.log('Time range in GTFS:', formatTime(minTime), '-', formatTime(maxTime))
      console.log('Current time:', formatTime(currentTimeSeconds))
    }
  }, [stopTimes, currentTimeSeconds])

  if (!feedStats) return null

  const speeds = [1, 2, 5, 10, 30, 60]

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      <div className="flex items-center gap-4 mb-3">
        {/* Play/Pause button */}
        <button
          onClick={togglePlayback}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            isPlaying
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isPlaying ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Current time display - full HH:MM:SS */}
        <div className="text-2xl font-mono font-bold text-gray-800 min-w-28">
          {formatTime(Math.floor(currentTimeSeconds))}
        </div>

        {/* Active vehicles count */}
        <div className="text-sm text-gray-500">
          <span className="font-semibold text-green-600">{vehiclePositions.length}</span>{' '}
          active vehicles
        </div>

        {/* Speed selector */}
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-gray-500 mr-2">Speed:</span>
          {speeds.map((speed) => (
            <button
              key={speed}
              onClick={() => setPlaybackSpeed(speed)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                playbackSpeed === speed
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* Time slider */}
      <div className="relative">
        <input
          type="range"
          min={0}
          max={86400}
          step={60}
          value={currentTimeSeconds}
          onChange={(e) => setCurrentTime(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        {/* Time markers */}
        <div className="flex justify-between text-xs text-gray-400 mt-1">
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
