import type { FeatureCollection, LineString } from 'geojson'
import type { GtfsShape, GtfsRoute, GtfsTrip } from '../../types/gtfs'

export interface ShapeProperties {
  shape_id: string
  route_id?: string
  route_short_name?: string
  route_long_name?: string
  route_type?: number
  color: string
}

export function shapesToGeoJson(
  shapes: GtfsShape[],
  routes: GtfsRoute[],
  trips: GtfsTrip[]
): FeatureCollection<LineString, ShapeProperties> {
  // Group shapes by shape_id
  const shapeGroups = new Map<string, GtfsShape[]>()

  for (const shape of shapes) {
    const existing = shapeGroups.get(shape.shape_id) || []
    existing.push(shape)
    shapeGroups.set(shape.shape_id, existing)
  }

  // Create route lookup
  const routeMap = new Map(routes.map((r) => [r.route_id, r]))

  // Create shape_id to route_id mapping via trips
  const shapeToRoute = new Map<string, string>()
  for (const trip of trips) {
    if (trip.shape_id && !shapeToRoute.has(trip.shape_id)) {
      shapeToRoute.set(trip.shape_id, trip.route_id)
    }
  }

  const features = []

  for (const [shapeId, points] of shapeGroups) {
    // Sort by sequence
    points.sort((a, b) => a.shape_pt_sequence - b.shape_pt_sequence)

    const routeId = shapeToRoute.get(shapeId)
    const route = routeId ? routeMap.get(routeId) : undefined

    // Default color or route color
    let color = '#3388ff'
    if (route?.route_color) {
      const colorStr = String(route.route_color)
      color = colorStr.startsWith('#') ? colorStr : `#${colorStr}`
    }

    features.push({
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: points.map((p) => [p.shape_pt_lon, p.shape_pt_lat]),
      },
      properties: {
        shape_id: shapeId,
        route_id: routeId,
        route_short_name: route?.route_short_name,
        route_long_name: route?.route_long_name,
        route_type: route?.route_type,
        color,
      },
    })
  }

  return {
    type: 'FeatureCollection',
    features,
  }
}

// Group shapes by shape_id for vehicle interpolation
export function groupShapesByShapeId(
  shapes: GtfsShape[]
): Map<string, [number, number][]> {
  const shapeGroups = new Map<string, GtfsShape[]>()

  for (const shape of shapes) {
    const existing = shapeGroups.get(shape.shape_id) || []
    existing.push(shape)
    shapeGroups.set(shape.shape_id, existing)
  }

  const result = new Map<string, [number, number][]>()
  for (const [shapeId, points] of shapeGroups) {
    points.sort((a, b) => a.shape_pt_sequence - b.shape_pt_sequence)
    result.set(
      shapeId,
      points.map((p) => [p.shape_pt_lon, p.shape_pt_lat])
    )
  }

  return result
}
