import { format } from 'date-fns'

export type CycleDates = {
  startDate?: Date | null
  plantingDate?: Date | null
  endDate?: Date | null
  expectedHarvest?: Date | null
  actualHarvest?: Date | null
  year?: number
  season?: string
}

export function cycleStart(c: CycleDates) {
  return c.startDate ?? c.plantingDate ?? null
}

export function cycleEnd(c: CycleDates) {
  return c.endDate ?? c.actualHarvest ?? c.expectedHarvest ?? null
}

export function cycleMonths(c: CycleDates) {
  const start = cycleStart(c)
  const end = cycleEnd(c)
  if (!start || !end) return null
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
  return Math.max(1, months)
}

export function cyclePeriod(c: CycleDates) {
  const start = cycleStart(c)
  const end = cycleEnd(c)
  const months = cycleMonths(c)
  if (!start || !end) return c.season && c.year ? `${c.season} ${c.year}` : 'Dates not set'
  const sameYear = start.getFullYear() === end.getFullYear()
  const from = format(start, sameYear ? 'MMM' : 'MMM yyyy')
  const to = format(end, 'MMM yyyy')
  return months ? `${from} – ${to} · ${months} mo` : `${from} – ${to}`
}

export function seasonFromRange(start: Date, end: Date) {
  const from = format(start, start.getFullYear() === end.getFullYear() ? 'MMM' : 'MMM yyyy')
  return `${from}–${format(end, 'MMM yyyy')}`
}

export function parseCycleRange(startRaw: string, endRaw: string) {
  const start = new Date(startRaw)
  const end = new Date(endRaw)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Start date and end date are required.')
  }
  if (end < start) throw new Error('End date must be on or after the start date.')
  return { start, end, year: start.getFullYear(), season: seasonFromRange(start, end) }
}
