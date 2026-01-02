import { useMemo } from 'react'
import { useGtfsStore } from '../../store/gtfsStore'
import { ROUTE_TYPES } from '../../types/gtfs'

export function AnalyticsPanel() {
  const { feedStats, routes, trips, stopTimes, shapes, frequencies } = useGtfsStore()

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

    return {
      routeTypeDistribution,
      avgTripsPerRoute,
      avgStopsPerTrip,
      shapesCoverage,
      routesWithShapes,
      routesWithFreq,
      totalShapePoints: shapes.length,
      uniqueShapes: new Set(shapes.map(s => s.shape_id)).size,
    }
  }, [feedStats, routes, trips, stopTimes, shapes, frequencies])

  if (!feedStats) return null

  return (
    <div className="analytics-panel">
      {/* Overview stats */}
      <div className="stats-grid">
        <StatCard label="Stops" value={feedStats.stopCount.toLocaleString()} color="rose" />
        <StatCard label="Routes" value={feedStats.routeCount.toLocaleString()} color="blue" />
        <StatCard label="Trips" value={feedStats.tripCount.toLocaleString()} color="emerald" />
        <StatCard label="Shapes" value={feedStats.shapeCount.toLocaleString()} color="violet" />
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
          <h4 className="analytics-title">Metrics</h4>
          <div className="stats-grid">
            <MetricItem label="Trips/Route" value={analytics.avgTripsPerRoute} />
            <MetricItem label="Stops/Trip" value={analytics.avgStopsPerTrip} />
            <MetricItem label="Shape coverage" value={`${analytics.shapesCoverage}%`} />
            <MetricItem label="Unique shapes" value={analytics.uniqueShapes.toLocaleString()} />
          </div>
        </div>
      )}

      {/* Data quality */}
      <div className="analytics-section">
        <h4 className="analytics-title">Data Quality</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <QualityIndicator
            label="Shapes"
            value={analytics?.shapesCoverage || 0}
            threshold={80}
          />
          <QualityIndicator
            label="Stop times"
            value={stopTimes.length > 0 ? 100 : 0}
            threshold={100}
          />
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: 'rose' | 'blue' | 'emerald' | 'violet' }) {
  return (
    <div className={`stat-card stat-${color}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
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

function QualityIndicator({ label, value, threshold }: { label: string; value: number; threshold: number }) {
  const isGood = value >= threshold
  return (
    <div className="quality-indicator">
      <span className="quality-label">{label}</span>
      <div className="quality-meter">
        <div className="quality-track">
          <div
            className={`quality-fill ${isGood ? 'good' : 'warning'}`}
            style={{ width: `${value}%` }}
          />
        </div>
        <span className={`quality-value ${isGood ? 'good' : 'warning'}`}>
          {value}%
        </span>
      </div>
    </div>
  )
}

export default AnalyticsPanel
