import { useMemo } from 'react'
import { useGtfsStore } from '../../store/gtfsStore'
import { ROUTE_TYPES } from '../../types/gtfs'

export function AnalyticsPanel() {
  const { feedStats, routes, trips, stopTimes, shapes, frequencies, stops, calendar } = useGtfsStore()

  // Calculate analytics
  const analytics = useMemo(() => {
    if (!feedStats) return null

    // Route types distribution
    const routeTypeDistribution = routes.reduce((acc, route) => {
      const typeName = ROUTE_TYPES[route.route_type] || `Type ${route.route_type}`
      acc[typeName] = (acc[typeName] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Trips per route (average)
    const avgTripsPerRoute = routes.length > 0 ? (trips.length / routes.length).toFixed(1) : '0'

    // Stops per trip (average)
    const tripsWithStops = new Set(stopTimes.map(st => st.trip_id))
    const avgStopsPerTrip = tripsWithStops.size > 0
      ? (stopTimes.length / tripsWithStops.size).toFixed(1)
      : '0'

    // Routes with shapes
    const routesWithShapes = new Set(trips.filter(t => t.shape_id).map(t => t.route_id)).size
    const shapesCoverage = routes.length > 0
      ? Math.round((routesWithShapes / routes.length) * 100)
      : 0

    // Routes with frequencies
    const tripsWithFreq = new Set(frequencies.map(f => f.trip_id))
    const routesWithFreq = new Set(trips.filter(t => tripsWithFreq.has(t.trip_id)).map(t => t.route_id)).size

    // Stops with coordinates
    const stopsWithCoords = stops.filter(s => s.stop_lat && s.stop_lon).length
    const stopsCoordsCoverage = stops.length > 0 ? Math.round((stopsWithCoords / stops.length) * 100) : 0

    // Trips with stop_times
    const tripsWithStopTimes = tripsWithStops.size
    const tripsCoverage = trips.length > 0 ? Math.round((tripsWithStopTimes / trips.length) * 100) : 0

    // Calendar coverage
    const calendarCoverage = calendar.length > 0 ? 100 : 0

    // Routes with colors
    const routesWithColors = routes.filter(r => r.route_color).length
    const colorsCoverage = routes.length > 0 ? Math.round((routesWithColors / routes.length) * 100) : 0

    // Stops with names
    const stopsWithNames = stops.filter(s => s.stop_name && s.stop_name.trim()).length
    const namesCoverage = stops.length > 0 ? Math.round((stopsWithNames / stops.length) * 100) : 0

    return {
      routeTypeDistribution,
      avgTripsPerRoute,
      avgStopsPerTrip,
      shapesCoverage,
      routesWithShapes,
      routesWithFreq,
      totalShapePoints: shapes.length,
      uniqueShapes: new Set(shapes.map(s => s.shape_id)).size,
      stopsCoordsCoverage,
      tripsCoverage,
      calendarCoverage,
      colorsCoverage,
      namesCoverage,
      hasFrequencies: frequencies.length > 0,
    }
  }, [feedStats, routes, trips, stopTimes, shapes, frequencies, stops, calendar])

  if (!feedStats) return null

  return (
    <div className="analytics-panel">
      {/* Data Quality - Primary focus */}
      <div className="analytics-section">
        <h4 className="analytics-title">Data Completeness</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <QualityIndicator
            label="Shape coverage"
            value={analytics?.shapesCoverage || 0}
            threshold={80}
            description={`${analytics?.routesWithShapes || 0} of ${routes.length} routes`}
          />
          <QualityIndicator
            label="Stop coordinates"
            value={analytics?.stopsCoordsCoverage || 0}
            threshold={100}
          />
          <QualityIndicator
            label="Trip schedules"
            value={analytics?.tripsCoverage || 0}
            threshold={90}
          />
          <QualityIndicator
            label="Stop names"
            value={analytics?.namesCoverage || 0}
            threshold={100}
          />
          <QualityIndicator
            label="Route colors"
            value={analytics?.colorsCoverage || 0}
            threshold={50}
          />
          <QualityIndicator
            label="Service calendar"
            value={analytics?.calendarCoverage || 0}
            threshold={100}
          />
        </div>
      </div>

      {/* Route type distribution */}
      {analytics && Object.keys(analytics.routeTypeDistribution).length > 0 && (
        <div className="analytics-section">
          <h4 className="analytics-title">Route Types</h4>
          <div>
            {Object.entries(analytics.routeTypeDistribution)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <div key={type} className="route-type-bar">
                  <div className="bar-header">
                    <span className="bar-label">{type}</span>
                    <span className="bar-value">{count}</span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${(count / routes.length) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Metrics */}
      {analytics && (
        <div className="analytics-section">
          <h4 className="analytics-title">Averages</h4>
          <div className="stats-grid">
            <MetricItem label="Trips/Route" value={analytics.avgTripsPerRoute} />
            <MetricItem label="Stops/Trip" value={analytics.avgStopsPerTrip} />
            <MetricItem label="Unique shapes" value={analytics.uniqueShapes.toLocaleString()} />
            <MetricItem label="Shape points" value={analytics.totalShapePoints.toLocaleString()} />
          </div>
        </div>
      )}

      {/* Optional data indicators */}
      <div className="analytics-section">
        <h4 className="analytics-title">Optional Files</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <OptionalBadge label="frequencies.txt" present={analytics?.hasFrequencies || false} />
          <OptionalBadge label="calendar.txt" present={(calendar?.length || 0) > 0} />
          <OptionalBadge label="shapes.txt" present={(shapes?.length || 0) > 0} />
        </div>
      </div>
    </div>
  )
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  )
}

function QualityIndicator({ label, value, threshold, description }: { label: string; value: number; threshold: number; description?: string }) {
  const isGood = value >= threshold
  const isMedium = value >= threshold * 0.5 && value < threshold

  const getStatus = () => {
    if (isGood) return 'good'
    if (isMedium) return 'medium'
    return 'warning'
  }

  return (
    <div className="quality-indicator">
      <div className="quality-info">
        <span className="quality-label">{label}</span>
        {description && <span className="quality-description">{description}</span>}
      </div>
      <div className="quality-meter">
        <div className="quality-track">
          <div
            className={`quality-fill ${getStatus()}`}
            style={{ width: `${value}%` }}
          />
        </div>
        <span className={`quality-value ${getStatus()}`}>
          {value}%
        </span>
      </div>
    </div>
  )
}

function OptionalBadge({ label, present }: { label: string; present: boolean }) {
  return (
    <div className={`optional-badge ${present ? 'present' : 'missing'}`}>
      {present ? (
        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      <span>{label}</span>
    </div>
  )
}

export default AnalyticsPanel
