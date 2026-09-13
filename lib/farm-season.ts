import { format } from 'date-fns'

export const WEATHER_SEASONS = ['Kharif', 'Rabi', 'Zaid'] as const
export type WeatherSeason = (typeof WEATHER_SEASONS)[number]

/** Typical India windows. Farmer can override dates on the farm. */
const WINDOWS: Record<WeatherSeason, { startMonth: number; startDay: number; endMonth: number; endDay: number; crossesYear: boolean }> = {
  Kharif: { startMonth: 6, startDay: 1, endMonth: 10, endDay: 31, crossesYear: false },
  Rabi: { startMonth: 11, startDay: 1, endMonth: 3, endDay: 31, crossesYear: true },
  Zaid: { startMonth: 3, startDay: 1, endMonth: 6, endDay: 15, crossesYear: false },
}

export function isWeatherSeason(value: string): value is WeatherSeason {
  return (WEATHER_SEASONS as readonly string[]).includes(value)
}

export function weatherSeason(value: string | null | undefined): WeatherSeason {
  const first = (value ?? '').trim().split(/\s+/)[0] ?? ''
  if (isWeatherSeason(first)) return first
  const lower = first.toLowerCase()
  if (lower === 'kharif' || lower === 'monsoon') return 'Kharif'
  if (lower === 'rabi' || lower === 'winter') return 'Rabi'
  if (lower === 'zaid' || lower === 'summer') return 'Zaid'
  return 'Kharif'
}

export function seasonWindow(season: string, year = new Date().getFullYear()) {
  const kind = weatherSeason(season)
  const w = WINDOWS[kind]
  const start = new Date(year, w.startMonth - 1, w.startDay)
  const end = new Date(w.crossesYear ? year + 1 : year, w.endMonth - 1, w.endDay)
  return { start, end, year, season: kind }
}

export function parseDay(raw: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim())
  if (!m) {
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) throw new Error('Start date and end date must be real dates.')
    return d
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

export function isoDay(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function farmSeasonLine(farm: {
  season: string
  startDate?: Date | string | null
  endDate?: Date | string | null
  year?: number
}) {
  const kind = weatherSeason(farm.season)
  const start = farm.startDate ? new Date(farm.startDate) : null
  const end = farm.endDate ? new Date(farm.endDate) : null
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${kind} season`
  }
  const sameYear = start.getFullYear() === end.getFullYear()
  const from = format(start, sameYear ? 'd MMM' : 'd MMM yyyy')
  const to = format(end, 'd MMM yyyy')
  return `${kind} · ${from} – ${to}`
}
