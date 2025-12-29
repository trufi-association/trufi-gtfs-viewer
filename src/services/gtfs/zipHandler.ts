import JSZip from 'jszip'

export interface GtfsFiles {
  stops?: string
  routes?: string
  trips?: string
  shapes?: string
  stopTimes?: string
  agency?: string
  calendar?: string
  calendarDates?: string
  feedInfo?: string
}

const FILE_MAPPING: Record<string, keyof GtfsFiles> = {
  'stops.txt': 'stops',
  'routes.txt': 'routes',
  'trips.txt': 'trips',
  'shapes.txt': 'shapes',
  'stop_times.txt': 'stopTimes',
  'agency.txt': 'agency',
  'calendar.txt': 'calendar',
  'calendar_dates.txt': 'calendarDates',
  'feed_info.txt': 'feedInfo',
}

export async function extractGtfsZip(
  file: File,
  onProgress?: (progress: number) => void
): Promise<GtfsFiles> {
  const zip = await JSZip.loadAsync(file)
  const files: GtfsFiles = {}
  const entries = Object.entries(FILE_MAPPING)
  let processed = 0

  for (const [filename, key] of entries) {
    const zipFile = zip.file(filename)
    if (zipFile) {
      files[key] = await zipFile.async('string')
    }
    processed++
    onProgress?.(Math.round((processed / entries.length) * 30)) // 0-30% for extraction
  }

  return files
}
