import { useMemo } from 'react'
import { useGtfsStore } from '../store/gtfsStore'
import { ROUTE_TYPES } from '../types/gtfs'

interface QualityModalProps {
  isOpen: boolean
  onClose: () => void
}

export function QualityModal({ isOpen, onClose }: QualityModalProps) {
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
    if (score >= 80) return 'var(--success)'
    if (score >= 50) return 'var(--warning)'
    return 'var(--danger)'
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
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Quality Report</span>
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Score Card */}
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
              <span className="score-description">Overall data quality</span>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-row">
            <div className="stat-box">
              <div className="stat-box-value">{feedStats.routeCount}</div>
              <div className="stat-box-label">Routes</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-value">{feedStats.stopCount.toLocaleString()}</div>
              <div className="stat-box-label">Stops</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-value">{feedStats.tripCount.toLocaleString()}</div>
              <div className="stat-box-label">Trips</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-value">{analytics?.uniqueShapes}</div>
              <div className="stat-box-label">Shapes</div>
            </div>
          </div>

          {/* Quality Metrics */}
          <div>
            <div className="section-title">Data Completeness</div>
            <div className="quality-grid">
              <QualityRow label="Shape coverage" value={analytics?.shapesCoverage || 0} detail={`${analytics?.routesWithShapes} of ${routes.length} routes`} />
              <QualityRow label="Stop coordinates" value={analytics?.stopsCoordsCoverage || 0} />
              <QualityRow label="Trip schedules" value={analytics?.tripsCoverage || 0} />
              <QualityRow label="Stop names" value={analytics?.namesCoverage || 0} />
              <QualityRow label="Route colors" value={analytics?.colorsCoverage || 0} />
              <QualityRow label="Service calendar" value={analytics?.calendarCoverage || 0} />
            </div>
          </div>

          {/* Route Types */}
          {analytics && Object.keys(analytics.routeTypeDistribution).length > 0 && (
            <div>
              <div className="section-title">Route Types</div>
              <div className="type-grid">
                {Object.entries(analytics.routeTypeDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <div key={type} className="type-chip">
                      <span className="type-name">{type}</span>
                      <span className="type-count">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Files */}
          <div>
            <div className="section-title">GTFS Files</div>
            <div className="file-grid">
              <FileChip label="stops.txt" present={stops.length > 0} />
              <FileChip label="routes.txt" present={routes.length > 0} />
              <FileChip label="trips.txt" present={trips.length > 0} />
              <FileChip label="stop_times.txt" present={stopTimes.length > 0} />
              <FileChip label="shapes.txt" present={shapes.length > 0} />
              <FileChip label="calendar.txt" present={calendar.length > 0} />
              <FileChip label="frequencies.txt" present={analytics?.hasFrequencies || false} />
            </div>
          </div>

          {/* Averages */}
          <div>
            <div className="section-title">Averages</div>
            <div className="averages-grid">
              <div className="avg-box">
                <div className="avg-value">{analytics?.avgTripsPerRoute}</div>
                <div className="avg-label">Trips/Route</div>
              </div>
              <div className="avg-box">
                <div className="avg-value">{analytics?.avgStopsPerTrip}</div>
                <div className="avg-label">Stops/Trip</div>
              </div>
              <div className="avg-box">
                <div className="avg-value">{analytics?.totalShapePoints.toLocaleString()}</div>
                <div className="avg-label">Shape pts</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function QualityRow({ label, value, detail }: { label: string; value: number; detail?: string }) {
  const getColor = (v: number) => {
    if (v >= 80) return 'var(--success)'
    if (v >= 50) return 'var(--warning)'
    return 'var(--danger)'
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

function FileChip({ label, present }: { label: string; present: boolean }) {
  return (
    <div className={`file-chip ${present ? 'present' : 'missing'}`}>
      {present ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      <span>{label}</span>
    </div>
  )
}

export default QualityModal
