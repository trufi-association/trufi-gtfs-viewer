import type {
  PrecomputedTrajectory,
  InterpolationResult,
  ShapePoint,
  TripSegment,
} from '../../types/gtfs'

// Binary search para encontrar el segmento que contiene el tiempo dado
// Retorna el índice del segmento donde startTime <= targetTime
function binarySearchSegment(segmentStartTimes: number[], targetTime: number): number {
  let low = 0
  let high = segmentStartTimes.length - 1

  // Si el tiempo es menor que el primer segmento, retornar 0
  if (targetTime < segmentStartTimes[0]) {
    return 0
  }

  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2)
    if (segmentStartTimes[mid] <= targetTime) {
      low = mid
    } else {
      high = mid - 1
    }
  }

  return low
}

// Binary search para encontrar los puntos del shape entre los que interpolar
// Basado en distancia recorrida
function findPointsForDistance(
  shapePoints: ShapePoint[],
  targetDistance: number
): { pointIndex: number; localT: number } {
  if (shapePoints.length < 2) {
    return { pointIndex: 0, localT: 0 }
  }

  // Si la distancia es mayor que el total, usar el último segmento
  const totalDistance = shapePoints[shapePoints.length - 1].distanceFromStart
  if (targetDistance >= totalDistance) {
    return { pointIndex: shapePoints.length - 2, localT: 1 }
  }

  if (targetDistance <= 0) {
    return { pointIndex: 0, localT: 0 }
  }

  // Binary search por distancia
  let low = 0
  let high = shapePoints.length - 1

  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2)
    if (shapePoints[mid].distanceFromStart <= targetDistance) {
      low = mid
    } else {
      high = mid - 1
    }
  }

  const pointIndex = low
  const p1 = shapePoints[pointIndex]
  const p2 = shapePoints[Math.min(pointIndex + 1, shapePoints.length - 1)]

  // Calcular interpolación local entre estos dos puntos
  const segmentLength = p2.distanceFromStart - p1.distanceFromStart
  const localT = segmentLength > 0 ? (targetDistance - p1.distanceFromStart) / segmentLength : 0

  return { pointIndex, localT: Math.min(1, Math.max(0, localT)) }
}

// Interpolación lineal simple (fallback)
function linearInterpolate(
  segment: TripSegment,
  t: number
): { position: [number, number]; bearing: number } {
  const lon = segment.fromCoord[0] + t * (segment.toCoord[0] - segment.fromCoord[0])
  const lat = segment.fromCoord[1] + t * (segment.toCoord[1] - segment.fromCoord[1])

  // Usar el bearing del primer shapePoint si existe
  const bearing = segment.shapePoints.length > 0 ? segment.shapePoints[0].bearing : 0

  return { position: [lon, lat], bearing }
}

// Interpolar posición a lo largo de una trayectoria pre-calculada
export function interpolateOnTrajectory(
  trajectory: PrecomputedTrajectory,
  elapsedTime: number
): InterpolationResult | null {
  const { segments, segmentStartTimes, totalDuration } = trajectory

  if (segments.length === 0) {
    return null
  }

  // Manejar casos límite
  if (elapsedTime < 0) {
    elapsedTime = 0
  }

  if (elapsedTime > totalDuration) {
    // Vehículo ya terminó su recorrido
    return null
  }

  // 1. Binary search para encontrar segmento actual O(log n)
  const segmentIndex = binarySearchSegment(segmentStartTimes, elapsedTime)

  if (segmentIndex < 0 || segmentIndex >= segments.length) {
    return null
  }

  const segment = segments[segmentIndex]

  // 2. Calcular progreso dentro del segmento (lineal = velocidad constante)
  const segmentDuration = segment.endTime - segment.startTime
  const segmentElapsed = elapsedTime - segment.startTime
  const t = segmentDuration > 0 ? Math.min(1, Math.max(0, segmentElapsed / segmentDuration)) : 0

  // 3. Interpolar posición
  let position: [number, number]
  let bearing: number

  if (segment.shapePoints.length < 2) {
    // Fallback a interpolación lineal
    const result = linearInterpolate(segment, t)
    position = result.position
    bearing = result.bearing
  } else {
    // Usar shape points para interpolación suave
    const distanceInSegment = t * segment.segmentDistance
    const { pointIndex, localT } = findPointsForDistance(segment.shapePoints, distanceInSegment)

    const p1 = segment.shapePoints[pointIndex]
    const p2 = segment.shapePoints[Math.min(pointIndex + 1, segment.shapePoints.length - 1)]

    // Interpolar entre los dos puntos del shape
    const lon = p1.lon + localT * (p2.lon - p1.lon)
    const lat = p1.lat + localT * (p2.lat - p1.lat)

    position = [lon, lat]
    bearing = p1.bearing
  }

  // 4. Calcular progreso total
  const progress = totalDuration > 0 ? elapsedTime / totalDuration : 0

  return {
    position,
    bearing,
    nextStopId: segment.toStopId,
    progress,
    segmentProgress: t,
  }
}
