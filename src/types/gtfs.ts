// GTFS Types based on the GTFS specification

export interface GtfsStop {
  stop_id: string
  stop_code?: string
  stop_name: string
  stop_desc?: string
  stop_lat: number
  stop_lon: number
  zone_id?: string
  stop_url?: string
  location_type?: number
  parent_station?: string
  stop_timezone?: string
  wheelchair_boarding?: number
}

export interface GtfsRoute {
  route_id: string
  agency_id?: string
  route_short_name?: string
  route_long_name?: string
  route_desc?: string
  route_type: number
  route_url?: string
  route_color?: string
  route_text_color?: string
  route_sort_order?: number
}

export interface GtfsTrip {
  route_id: string
  service_id: string
  trip_id: string
  trip_headsign?: string
  trip_short_name?: string
  direction_id?: number
  block_id?: string
  shape_id?: string
  wheelchair_accessible?: number
  bikes_allowed?: number
}

export interface GtfsShape {
  shape_id: string
  shape_pt_lat: number
  shape_pt_lon: number
  shape_pt_sequence: number
  shape_dist_traveled?: number
}

export interface GtfsStopTime {
  trip_id: string
  arrival_time: string
  departure_time: string
  stop_id: string
  stop_sequence: number
  stop_headsign?: string
  pickup_type?: number
  drop_off_type?: number
  shape_dist_traveled?: number
  timepoint?: number
}

export interface GtfsCalendar {
  service_id: string
  monday: number
  tuesday: number
  wednesday: number
  thursday: number
  friday: number
  saturday: number
  sunday: number
  start_date: string
  end_date: string
}

export interface GtfsCalendarDate {
  service_id: string
  date: string
  exception_type: number
}

export interface GtfsFrequency {
  trip_id: string
  start_time: string
  end_time: string
  headway_secs: number
  exact_times?: number
}

export interface GtfsAgency {
  agency_id?: string
  agency_name: string
  agency_url: string
  agency_timezone: string
  agency_lang?: string
  agency_phone?: string
  agency_fare_url?: string
  agency_email?: string
}

export interface GtfsFeedInfo {
  feed_publisher_name: string
  feed_publisher_url: string
  feed_lang: string
  feed_start_date?: string
  feed_end_date?: string
  feed_version?: string
  feed_contact_email?: string
  feed_contact_url?: string
}

// Route type constants
export const ROUTE_TYPES: Record<number, string> = {
  0: 'Tram',
  1: 'Metro',
  2: 'Rail',
  3: 'Bus',
  4: 'Ferry',
  5: 'Cable Tram',
  6: 'Aerial Lift',
  7: 'Funicular',
  11: 'Trolleybus',
  12: 'Monorail',
}

// Parsed GTFS data structure
export interface ParsedGtfsData {
  stops: GtfsStop[]
  routes: GtfsRoute[]
  trips: GtfsTrip[]
  shapes: GtfsShape[]
  stopTimes: GtfsStopTime[]
  calendar: GtfsCalendar[]
  calendarDates: GtfsCalendarDate[]
  frequencies: GtfsFrequency[]
  agency: GtfsAgency[]
  feedInfo: GtfsFeedInfo | null
}

// Vehicle position for simulation
export interface VehiclePosition {
  tripId: string
  routeId: string
  position: [number, number]
  bearing: number
  nextStopId: string
  progress: number
  color: string
  headsign?: string
}
