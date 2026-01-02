import type { ParsedGtfsData, GtfsStop, GtfsRoute, GtfsTrip, GtfsShape, GtfsStopTime, GtfsCalendar, GtfsCalendarDate, GtfsFrequency, GtfsAgency, GtfsFeedInfo } from '../../types/gtfs'
import { extractGtfsZip } from './zipHandler'
import { parseGtfsCsv } from './csvParser'

export async function parseGtfsFile(
  file: File,
  onProgress?: (progress: number, message: string) => void
): Promise<ParsedGtfsData> {
  // Step 1: Extract ZIP (0-30%)
  onProgress?.(0, 'Extracting GTFS files...')
  const files = await extractGtfsZip(file, (p) => onProgress?.(p, 'Extracting GTFS files...'))

  // Step 2: Parse CSV files (30-90%)
  const result: ParsedGtfsData = {
    stops: [],
    routes: [],
    trips: [],
    shapes: [],
    stopTimes: [],
    calendar: [],
    calendarDates: [],
    frequencies: [],
    agency: [],
    feedInfo: null,
  }

  onProgress?.(35, 'Parsing stops...')
  if (files.stops) {
    result.stops = parseGtfsCsv<GtfsStop>(files.stops)
  }

  onProgress?.(40, 'Parsing routes...')
  if (files.routes) {
    result.routes = parseGtfsCsv<GtfsRoute>(files.routes)
  }

  onProgress?.(45, 'Parsing trips...')
  if (files.trips) {
    result.trips = parseGtfsCsv<GtfsTrip>(files.trips)
  }

  onProgress?.(55, 'Parsing shapes...')
  if (files.shapes) {
    result.shapes = parseGtfsCsv<GtfsShape>(files.shapes)
  }

  onProgress?.(70, 'Parsing stop times...')
  if (files.stopTimes) {
    result.stopTimes = parseGtfsCsv<GtfsStopTime>(files.stopTimes)
  }

  onProgress?.(80, 'Parsing calendar...')
  if (files.calendar) {
    result.calendar = parseGtfsCsv<GtfsCalendar>(files.calendar)
  }

  onProgress?.(82, 'Parsing calendar dates...')
  if (files.calendarDates) {
    result.calendarDates = parseGtfsCsv<GtfsCalendarDate>(files.calendarDates)
  }

  onProgress?.(84, 'Parsing frequencies...')
  if (files.frequencies) {
    result.frequencies = parseGtfsCsv<GtfsFrequency>(files.frequencies)
  }

  onProgress?.(86, 'Parsing agency...')
  if (files.agency) {
    result.agency = parseGtfsCsv<GtfsAgency>(files.agency)
  }

  onProgress?.(88, 'Parsing feed info...')
  if (files.feedInfo) {
    const feedInfoArr = parseGtfsCsv<GtfsFeedInfo>(files.feedInfo)
    result.feedInfo = feedInfoArr[0] || null
  }

  onProgress?.(100, 'Complete!')
  return result
}
