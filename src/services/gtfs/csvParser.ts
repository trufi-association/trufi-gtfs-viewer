import Papa from 'papaparse'

// Fields that should NOT be dynamically typed (keep as strings)
const STRING_FIELDS = new Set([
  'arrival_time',
  'departure_time',
  'start_date',
  'end_date',
  'date',
  'stop_id',
  'route_id',
  'trip_id',
  'service_id',
  'shape_id',
  'agency_id',
  'block_id',
  'parent_station',
  'stop_code',
  'route_color',
  'route_text_color',
])

export function parseGtfsCsv<T>(csvText: string): T[] {
  const result = Papa.parse<T>(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: (field) => typeof field === 'string' ? !STRING_FIELDS.has(field) : true,
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim(),
  })

  if (result.errors.length > 0) {
    console.warn('CSV parsing warnings:', result.errors)
  }

  return result.data
}
