import { useMemo } from 'react'
import { useGtfsStore } from '../../store/gtfsStore'
import { ROUTE_TYPES } from '../../types/gtfs'

interface AnalyticsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AnalyticsModal({ isOpen, onClose }: AnalyticsModalProps) {
  const { feedStats, routes, trips, stopTimes, shapes, frequencies, stops, calendar } = useGtfsStore()

  const analytics = useMemo(() => {
    if (!feedStats) return null

    const routeTypeDistribution = routes.reduce((acc, route) => {
      const typeName = ROUTE_TYPES[route.route_type] || `Type ${route.route_type}`
      acc[typeName] = (acc[typeName] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const avgTripsPerRoute = routes.length > 0 ? (trips.length / routes.length).toFixed(1) : '0'
    const tripsWithStops = new Set(stopTimes.map(st => st.trip_id))
    const avgStopsPerTrip = tripsWithStops.size > 0 ? (stopTimes.length / tripsWithStops.size).toFixed(1) : '0'

    const routesWithShapes = new Set(trips.filter(t => t.shape_id).map(t => t.route_id)).size
    const shapesCoverage = routes.length > 0 ? Math.round((routesWithShapes / routes.length) * 100) : 0

    const stopsWithCoords = stops.filter(s => s.stop_lat && s.stop_lon).length
    const stopsCoordsCoverage = stops.length > 0 ? Math.round((stopsWithCoords / stops.length) * 100) : 0

    const tripsCoverage = trips.length > 0 ? Math.round((tripsWithStops.size / trips.length) * 100) : 0
    const calendarCoverage = calendar.length > 0 ? 100 : 0

    const routesWithColors = routes.filter(r => r.route_color).length
    const colorsCoverage = routes.length > 0 ? Math.round((routesWithColors / routes.length) * 100) : 0

    const stopsWithNames = stops.filter(s => s.stop_name && s.stop_name.trim()).length
    const namesCoverage = stops.length > 0 ? Math.round((stopsWithNames / stops.length) * 100) : 0

    // Calculate overall score
    const scores = [shapesCoverage, stopsCoordsCoverage, tripsCoverage, namesCoverage, calendarCoverage]
    const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)

    return {
      routeTypeDistribution,
      avgTripsPerRoute,
      avgStopsPerTrip,
      shapesCoverage,
      routesWithShapes,
      stopsCoordsCoverage,
      tripsCoverage,
      calendarCoverage,
      colorsCoverage,
      namesCoverage,
      hasFrequencies: frequencies.length > 0,
      uniqueShapes: new Set(shapes.map(s => s.shape_id)).size,
      totalShapePoints: shapes.length,
      overallScore,
    }
  }, [feedStats, routes, trips, stopTimes, shapes, frequencies, stops, calendar])

  if (!isOpen || !feedStats) return null

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#22c55e'
    if (score >= 50) return '#f59e0b'
    return '#ef4444'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent'
    if (score >= 80) return 'Good'
    if (score >= 60) return 'Fair'
    if (score >= 40) return 'Poor'
    return 'Critical'
  }

  return (
    <>
      {/* Backdrop */}
      <div className="analytics-modal-backdrop" onClick={onClose} />

      {/* Modal */}
      <div className="analytics-modal">
        {/* Header */}
        <div className="analytics-modal-header">
          <div className="analytics-modal-title">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>GTFS Quality Report</span>
          </div>
          <button className="analytics-modal-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="analytics-modal-content">
          {/* Overall Score */}
          <div className="score-card">
            <div className="score-circle" style={{ borderColor: getScoreColor(analytics?.overallScore || 0) }}>
              <span className="score-value" style={{ color: getScoreColor(analytics?.overallScore || 0) }}>
                {analytics?.overallScore}
              </span>
              <span className="score-suffix">%</span>
            </div>
            <div className="score-info">
              <span className="score-label" style={{ color: getScoreColor(analytics?.overallScore || 0) }}>
                {getScoreLabel(analytics?.overallScore || 0)}
              </span>
              <span className="score-description">Overall data quality score</span>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="analytics-stats-row">
            <div className="analytics-stat-box">
              <span className="analytics-stat-value">{feedStats.routeCount}</span>
              <span className="analytics-stat-label">Routes</span>
            </div>
            <div className="analytics-stat-box">
              <span className="analytics-stat-value">{feedStats.stopCount.toLocaleString()}</span>
              <span className="analytics-stat-label">Stops</span>
            </div>
            <div className="analytics-stat-box">
              <span className="analytics-stat-value">{feedStats.tripCount.toLocaleString()}</span>
              <span className="analytics-stat-label">Trips</span>
            </div>
            <div className="analytics-stat-box">
              <span className="analytics-stat-value">{analytics?.uniqueShapes}</span>
              <span className="analytics-stat-label">Shapes</span>
            </div>
          </div>

          {/* Quality Metrics */}
          <div className="analytics-section-title">Data Completeness</div>
          <div className="quality-grid">
            <QualityRow label="Shape coverage" value={analytics?.shapesCoverage || 0} detail={`${analytics?.routesWithShapes} of ${routes.length} routes`} />
            <QualityRow label="Stop coordinates" value={analytics?.stopsCoordsCoverage || 0} />
            <QualityRow label="Trip schedules" value={analytics?.tripsCoverage || 0} />
            <QualityRow label="Stop names" value={analytics?.namesCoverage || 0} />
            <QualityRow label="Route colors" value={analytics?.colorsCoverage || 0} />
            <QualityRow label="Service calendar" value={analytics?.calendarCoverage || 0} />
          </div>

          {/* Route Types */}
          {analytics && Object.keys(analytics.routeTypeDistribution).length > 0 && (
            <>
              <div className="analytics-section-title">Route Types</div>
              <div className="route-types-grid">
                {Object.entries(analytics.routeTypeDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <div key={type} className="route-type-chip">
                      <span className="route-type-name">{type}</span>
                      <span className="route-type-count">{count}</span>
                    </div>
                  ))}
              </div>
            </>
          )}

          {/* Files */}
          <div className="analytics-section-title">GTFS Files</div>
          <div className="files-grid">
            <FileStatus label="stops.txt" present={stops.length > 0} />
            <FileStatus label="routes.txt" present={routes.length > 0} />
            <FileStatus label="trips.txt" present={trips.length > 0} />
            <FileStatus label="stop_times.txt" present={stopTimes.length > 0} />
            <FileStatus label="shapes.txt" present={shapes.length > 0} />
            <FileStatus label="calendar.txt" present={calendar.length > 0} />
            <FileStatus label="frequencies.txt" present={analytics?.hasFrequencies || false} />
          </div>

          {/* Averages */}
          <div className="analytics-section-title">Averages</div>
          <div className="averages-grid">
            <div className="average-item">
              <span className="average-value">{analytics?.avgTripsPerRoute}</span>
              <span className="average-label">Trips per route</span>
            </div>
            <div className="average-item">
              <span className="average-value">{analytics?.avgStopsPerTrip}</span>
              <span className="average-label">Stops per trip</span>
            </div>
            <div className="average-item">
              <span className="average-value">{analytics?.totalShapePoints.toLocaleString()}</span>
              <span className="average-label">Shape points</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function QualityRow({ label, value, detail }: { label: string; value: number; detail?: string }) {
  const getColor = (v: number) => {
    if (v >= 80) return '#22c55e'
    if (v >= 50) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div className="quality-row">
      <div className="quality-row-info">
        <span className="quality-row-label">{label}</span>
        {detail && <span className="quality-row-detail">{detail}</span>}
      </div>
      <div className="quality-row-meter">
        <div className="quality-row-track">
          <div className="quality-row-fill" style={{ width: `${value}%`, background: getColor(value) }} />
        </div>
        <span className="quality-row-value" style={{ color: getColor(value) }}>{value}%</span>
      </div>
    </div>
  )
}

function FileStatus({ label, present }: { label: string; present: boolean }) {
  return (
    <div className={`file-status ${present ? 'present' : 'missing'}`}>
      {present ? (
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      <span>{label}</span>
    </div>
  )
}

export default AnalyticsModal
