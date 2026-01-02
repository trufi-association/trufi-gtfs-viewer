import type { GtfsFiles } from './zipHandler'

const FILE_MAPPING: Record<string, keyof GtfsFiles> = {
  'stops.txt': 'stops',
  'routes.txt': 'routes',
  'trips.txt': 'trips',
  'shapes.txt': 'shapes',
  'stop_times.txt': 'stopTimes',
  'agency.txt': 'agency',
  'calendar.txt': 'calendar',
  'calendar_dates.txt': 'calendarDates',
  'frequencies.txt': 'frequencies',
  'feed_info.txt': 'feedInfo',
}

export async function extractGtfsFolder(
  files: File[],
  onProgress?: (progress: number) => void
): Promise<GtfsFiles> {
  const gtfsFiles: GtfsFiles = {}
  const entries = Object.entries(FILE_MAPPING)
  let processed = 0

  for (const [filename, key] of entries) {
    const file = files.find((f) => f.name === filename || f.webkitRelativePath.endsWith(`/${filename}`))
    if (file) {
      gtfsFiles[key] = await file.text()
    }
    processed++
    onProgress?.(Math.round((processed / entries.length) * 30))
  }

  return gtfsFiles
}

export function isGtfsFolder(files: File[]): boolean {
  const fileNames = files.map((f) => f.name)
  return fileNames.includes('stops.txt') || fileNames.includes('routes.txt')
}
