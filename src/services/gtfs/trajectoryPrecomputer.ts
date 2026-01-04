import type {
  GtfsShape,
  GtfsTrip,
  GtfsStopTime,
  GtfsStop,
  GtfsRoute,
  GtfsFrequency,
  ShapePoint,
  TripSegment,
  PrecomputedTrajectory,
  TrajectoryCache,
  TimeIndexedVehicles,
  ActiveVehicleInstance,
} from '../../types/gtfs'
import { parseGtfsTime } from './vehicleInterpolator'

const BUCKET_SIZE = 300 // 5 minutos en segundos
const MAX_SNAP_DISTANCE = 500 // metros máximos para vincular stop a shape

// Calcular distancia entre dos coordenadas usando fórmula de Haversine
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000 // Radio de la Tierra en metros
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Calcular bearing entre dos puntos
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const lat1Rad = (lat1 * Math.PI) / 180
  const lat2Rad = (lat2 * Math.PI) / 180

  const y = Math.sin(dLon) * Math.cos(lat2Rad)
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon)

  const bearing = (Math.atan2(y, x) * 180) / Math.PI
  return (bearing + 360) % 360
}

// Procesar un shape y calcular distancias acumuladas
export function processShape(shapePoints: GtfsShape[]): ShapePoint[] {
  if (shapePoints.length === 0) return []

  // Ordenar por secuencia
  const sorted = [...shapePoints].sort((a, b) => a.shape_pt_sequence - b.shape_pt_sequence)

  const result: ShapePoint[] = []
  let accumulatedDistance = 0

  for (let i = 0; i < sorted.length; i++) {
    const pt = sorted[i]

    if (i > 0) {
      const prev = sorted[i - 1]
      accumulatedDistance += haversineDistance(
        prev.shape_pt_lat,
        prev.shape_pt_lon,
        pt.shape_pt_lat,
        pt.shape_pt_lon
      )
    }

    // Calcular bearing hacia el siguiente punto
    let bearing = 0
    if (i < sorted.length - 1) {
      const next = sorted[i + 1]
      bearing = calculateBearing(pt.shape_pt_lat, pt.shape_pt_lon, next.shape_pt_lat, next.shape_pt_lon)
    } else if (i > 0) {
      // Último punto: usar bearing del punto anterior
      const prev = sorted[i - 1]
      bearing = calculateBearing(prev.shape_pt_lat, prev.shape_pt_lon, pt.shape_pt_lat, pt.shape_pt_lon)
    }

    result.push({
      lon: pt.shape_pt_lon,
      lat: pt.shape_pt_lat,
      distanceFromStart: accumulatedDistance,
      bearing,
    })
  }

  return result
}

// Encontrar el índice del punto del shape más cercano a una coordenada
function findNearestShapePointIndex(
  coord: [number, number],
  shapePoints: ShapePoint[],
  startIndex: number = 0
): { index: number; distance: number } {
  let minDistance = Infinity
  let bestIndex = startIndex

  // Buscar desde startIndex en adelante (los shapes son ordenados)
  for (let i = startIndex; i < shapePoints.length; i++) {
    const pt = shapePoints[i]
    const dist = haversineDistance(coord[1], coord[0], pt.lat, pt.lon)

    if (dist < minDistance) {
      minDistance = dist
      bestIndex = i
    }

    // Optimización: si la distancia empieza a crecer mucho, podemos parar
    // (asumiendo que el shape es continuo y no vuelve sobre sí mismo)
    if (dist > minDistance * 3 && i > bestIndex + 10) {
      break
    }
  }

  return { index: bestIndex, distance: minDistance }
}

// Crear segmentos lineales (fallback cuando no hay shape)
function createLinearSegments(
  tripStopTimes: GtfsStopTime[],
  stopsMap: Map<string, GtfsStop>
): TripSegment[] {
  const segments: TripSegment[] = []
  const firstDeparture = parseGtfsTime(tripStopTimes[0].departure_time)

  for (let i = 0; i < tripStopTimes.length - 1; i++) {
    const fromSt = tripStopTimes[i]
    const toSt = tripStopTimes[i + 1]
    const fromStop = stopsMap.get(fromSt.stop_id)
    const toStop = stopsMap.get(toSt.stop_id)

    if (!fromStop || !toStop) continue

    const fromCoord: [number, number] = [fromStop.stop_lon, fromStop.stop_lat]
    const toCoord: [number, number] = [toStop.stop_lon, toStop.stop_lat]
    const distance = haversineDistance(fromStop.stop_lat, fromStop.stop_lon, toStop.stop_lat, toStop.stop_lon)

    const startTime = parseGtfsTime(fromSt.departure_time) - firstDeparture
    const endTime = parseGtfsTime(toSt.arrival_time) - firstDeparture

    // Crear dos ShapePoints para interpolación lineal
    const bearing = calculateBearing(fromStop.stop_lat, fromStop.stop_lon, toStop.stop_lat, toStop.stop_lon)

    segments.push({
      fromStopId: fromSt.stop_id,
      toStopId: toSt.stop_id,
      startTime,
      endTime,
      shapePoints: [
        { lon: fromCoord[0], lat: fromCoord[1], distanceFromStart: 0, bearing },
        { lon: toCoord[0], lat: toCoord[1], distanceFromStart: distance, bearing },
      ],
      segmentDistance: distance,
      fromCoord,
      toCoord,
    })
  }

  return segments
}

// Mapear paradas a segmentos del shape
function mapStopsToShapeSegments(
  tripStopTimes: GtfsStopTime[],
  shapePoints: ShapePoint[],
  stopsMap: Map<string, GtfsStop>
): TripSegment[] {
  if (shapePoints.length < 2) {
    return createLinearSegments(tripStopTimes, stopsMap)
  }

  const segments: TripSegment[] = []
  const firstDeparture = parseGtfsTime(tripStopTimes[0].departure_time)

  // Encontrar índices de shape para cada parada
  const stopShapeIndices: number[] = []
  let lastIndex = 0

  for (const st of tripStopTimes) {
    const stop = stopsMap.get(st.stop_id)
    if (!stop) {
      stopShapeIndices.push(lastIndex)
      continue
    }

    const coord: [number, number] = [stop.stop_lon, stop.stop_lat]
    const { index, distance } = findNearestShapePointIndex(coord, shapePoints, lastIndex)

    if (distance > MAX_SNAP_DISTANCE) {
      // Parada muy lejos del shape, usar índice anterior
      stopShapeIndices.push(lastIndex)
    } else {
      stopShapeIndices.push(index)
      lastIndex = index
    }
  }

  // Crear segmentos entre paradas consecutivas
  for (let i = 0; i < tripStopTimes.length - 1; i++) {
    const fromSt = tripStopTimes[i]
    const toSt = tripStopTimes[i + 1]
    const fromStop = stopsMap.get(fromSt.stop_id)
    const toStop = stopsMap.get(toSt.stop_id)

    if (!fromStop || !toStop) continue

    const fromCoord: [number, number] = [fromStop.stop_lon, fromStop.stop_lat]
    const toCoord: [number, number] = [toStop.stop_lon, toStop.stop_lat]

    const startShapeIdx = stopShapeIndices[i]
    const endShapeIdx = stopShapeIndices[i + 1]

    const startTime = parseGtfsTime(fromSt.departure_time) - firstDeparture
    const endTime = parseGtfsTime(toSt.arrival_time) - firstDeparture

    // Extraer puntos del shape para este segmento
    let segmentShapePoints: ShapePoint[]
    let segmentDistance: number

    if (endShapeIdx > startShapeIdx) {
      // Hay puntos del shape entre las paradas
      segmentShapePoints = shapePoints.slice(startShapeIdx, endShapeIdx + 1)

      // Recalcular distancias relativas al inicio del segmento
      const startDistance = segmentShapePoints[0].distanceFromStart
      segmentShapePoints = segmentShapePoints.map((pt) => ({
        ...pt,
        distanceFromStart: pt.distanceFromStart - startDistance,
      }))

      segmentDistance = segmentShapePoints[segmentShapePoints.length - 1].distanceFromStart
    } else {
      // No hay puntos del shape, usar interpolación lineal
      segmentDistance = haversineDistance(fromStop.stop_lat, fromStop.stop_lon, toStop.stop_lat, toStop.stop_lon)
      const bearing = calculateBearing(fromStop.stop_lat, fromStop.stop_lon, toStop.stop_lat, toStop.stop_lon)

      segmentShapePoints = [
        { lon: fromCoord[0], lat: fromCoord[1], distanceFromStart: 0, bearing },
        { lon: toCoord[0], lat: toCoord[1], distanceFromStart: segmentDistance, bearing },
      ]
    }

    segments.push({
      fromStopId: fromSt.stop_id,
      toStopId: toSt.stop_id,
      startTime,
      endTime,
      shapePoints: segmentShapePoints,
      segmentDistance,
      fromCoord,
      toCoord,
    })
  }

  return segments
}

// Pre-calcular todas las trayectorias
export function precomputeTrajectories(
  shapes: GtfsShape[],
  trips: GtfsTrip[],
  stopTimes: GtfsStopTime[],
  stops: GtfsStop[],
  onProgress?: (percent: number, message: string) => void
): TrajectoryCache {
  const trajectories = new Map<string, PrecomputedTrajectory>()
  const processedShapes = new Map<string, ShapePoint[]>()
  const stopCoords = new Map<string, [number, number]>()

  // Crear mapa de coordenadas de paradas
  for (const stop of stops) {
    stopCoords.set(stop.stop_id, [stop.stop_lon, stop.stop_lat])
  }
  const stopsMap = new Map(stops.map((s) => [s.stop_id, s]))

  // Agrupar shapes por shape_id
  const shapesByIdRaw = new Map<string, GtfsShape[]>()
  for (const shape of shapes) {
    const existing = shapesByIdRaw.get(shape.shape_id) || []
    existing.push(shape)
    shapesByIdRaw.set(shape.shape_id, existing)
  }

  // Procesar shapes
  onProgress?.(0, 'Procesando shapes...')
  let shapeCount = 0
  const totalShapes = shapesByIdRaw.size

  for (const [shapeId, shapePoints] of shapesByIdRaw) {
    processedShapes.set(shapeId, processShape(shapePoints))
    shapeCount++
    if (shapeCount % 100 === 0) {
      onProgress?.(Math.floor((shapeCount / totalShapes) * 30), `Procesando shapes (${shapeCount}/${totalShapes})...`)
    }
  }

  // Agrupar stop_times por trip_id
  const stopTimesByTrip = new Map<string, GtfsStopTime[]>()
  for (const st of stopTimes) {
    const existing = stopTimesByTrip.get(st.trip_id) || []
    existing.push(st)
    stopTimesByTrip.set(st.trip_id, existing)
  }

  // Ordenar stop_times por secuencia
  for (const [, times] of stopTimesByTrip) {
    times.sort((a, b) => a.stop_sequence - b.stop_sequence)
  }

  // Crear trayectorias para cada trip
  onProgress?.(30, 'Calculando trayectorias...')
  let tripCount = 0
  const totalTrips = trips.length

  for (const trip of trips) {
    const tripStopTimes = stopTimesByTrip.get(trip.trip_id)
    if (!tripStopTimes || tripStopTimes.length < 2) continue

    const firstTime = parseGtfsTime(tripStopTimes[0].departure_time)
    const lastTime = parseGtfsTime(tripStopTimes[tripStopTimes.length - 1].arrival_time)

    if (firstTime < 0 || lastTime < 0) continue

    const shapeId = trip.shape_id || null
    const shapePoints = shapeId ? processedShapes.get(shapeId) || [] : []

    const segments = mapStopsToShapeSegments(tripStopTimes, shapePoints, stopsMap)

    if (segments.length === 0) continue

    const totalDistance = segments.reduce((sum, seg) => sum + seg.segmentDistance, 0)
    const totalDuration = lastTime - firstTime
    const segmentStartTimes = segments.map((seg) => seg.startTime)

    trajectories.set(trip.trip_id, {
      tripId: trip.trip_id,
      shapeId,
      totalDistance,
      totalDuration,
      segments,
      segmentStartTimes,
    })

    tripCount++
    if (tripCount % 500 === 0) {
      onProgress?.(30 + Math.floor((tripCount / totalTrips) * 60), `Calculando trayectorias (${tripCount}/${totalTrips})...`)
    }
  }

  onProgress?.(90, 'Trayectorias calculadas')

  return { trajectories, processedShapes, stopCoords }
}

// Construir índice temporal de vehículos activos
export function buildTimeIndex(
  cache: TrajectoryCache,
  trips: GtfsTrip[],
  frequencies: GtfsFrequency[],
  routes: GtfsRoute[],
  onProgress?: (percent: number, message: string) => void
): TimeIndexedVehicles {
  const buckets = new Map<number, ActiveVehicleInstance[]>()
  const routesMap = new Map(routes.map((r) => [r.route_id, r]))
  const tripsMap = new Map(trips.map((t) => [t.trip_id, t]))

  onProgress?.(92, 'Construyendo índice temporal...')

  if (frequencies.length > 0) {
    // Frequency-based GTFS
    const freqsByTrip = new Map<string, GtfsFrequency[]>()
    for (const freq of frequencies) {
      const existing = freqsByTrip.get(freq.trip_id) || []
      existing.push(freq)
      freqsByTrip.set(freq.trip_id, existing)
    }

    for (const [tripId, freqs] of freqsByTrip) {
      const trajectory = cache.trajectories.get(tripId)
      if (!trajectory) continue

      const trip = tripsMap.get(tripId)
      const route = trip ? routesMap.get(trip.route_id) : undefined

      let color = '#3388ff'
      if (route?.route_color) {
        const colorStr = String(route.route_color)
        color = colorStr.startsWith('#') ? colorStr : `#${colorStr}`
      }

      for (const freq of freqs) {
        const freqStart = parseGtfsTime(freq.start_time)
        const freqEnd = parseGtfsTime(freq.end_time)
        const headway = freq.headway_secs

        if (freqStart < 0 || freqEnd < 0 || headway <= 0) continue

        // Generar todas las instancias de este trip
        let instanceNum = 0
        for (let departureTime = freqStart; departureTime < freqEnd; departureTime += headway) {
          const startTime = departureTime
          const endTime = departureTime + trajectory.totalDuration

          const instance: ActiveVehicleInstance = {
            tripId,
            instanceId: `${tripId}_${instanceNum}`,
            trajectory,
            startTime,
            endTime,
            routeId: trip?.route_id || '',
            color,
            headsign: trip?.trip_headsign,
          }

          // Agregar a todos los buckets que cubre
          const startBucket = Math.floor(startTime / BUCKET_SIZE)
          const endBucket = Math.floor(endTime / BUCKET_SIZE)

          for (let bucket = startBucket; bucket <= endBucket; bucket++) {
            const existing = buckets.get(bucket) || []
            existing.push(instance)
            buckets.set(bucket, existing)
          }

          instanceNum++
        }
      }
    }
  } else {
    // Schedule-based GTFS
    for (const trip of trips) {
      const trajectory = cache.trajectories.get(trip.trip_id)
      if (!trajectory) continue

      const route = routesMap.get(trip.route_id)

      let color = '#3388ff'
      if (route?.route_color) {
        const colorStr = String(route.route_color)
        color = colorStr.startsWith('#') ? colorStr : `#${colorStr}`
      }

      // Para schedule-based, el startTime es el primer departure del trip
      // Necesitamos obtenerlo del primer segmento + ajuste por tiempo absoluto
      // Por ahora asumimos que segments[0].startTime es relativo al inicio del día
      // Esto requiere ajuste según el dataset real

      const firstSegmentTime = trajectory.segments[0]?.startTime || 0
      // Necesitamos el tiempo absoluto del primer departure
      // Lo calculamos buscando en el stopTimesByTrip original
      // Por ahora, usamos una aproximación basada en la duración

      const instance: ActiveVehicleInstance = {
        tripId: trip.trip_id,
        instanceId: trip.trip_id,
        trajectory,
        startTime: firstSegmentTime, // Esto necesita ajuste para tiempos absolutos
        endTime: firstSegmentTime + trajectory.totalDuration,
        routeId: trip.route_id,
        color,
        headsign: trip.trip_headsign,
      }

      const startBucket = Math.floor(instance.startTime / BUCKET_SIZE)
      const endBucket = Math.floor(instance.endTime / BUCKET_SIZE)

      for (let bucket = startBucket; bucket <= endBucket; bucket++) {
        const existing = buckets.get(bucket) || []
        existing.push(instance)
        buckets.set(bucket, existing)
      }
    }
  }

  onProgress?.(98, 'Índice temporal construido')

  return { buckets, bucketSize: BUCKET_SIZE }
}
