import type { AreaUnit } from './types'

const SQM_PER: Record<AreaUnit, number> = {
  sqm: 1,
  sqft: 0.09290304,
  acre: 4046.8564224,
  hectare: 10000,
  cent: 40.468564224,
  guntha: 101.17141056,
}

export function fromSqm(sqm: number, unit: AreaUnit): number {
  return sqm / SQM_PER[unit]
}

export function toSqm(value: number, unit: AreaUnit): number {
  return value * SQM_PER[unit]
}

export function convertArea(value: number, from: AreaUnit, to: AreaUnit): number {
  return fromSqm(toSqm(value, from), to)
}

export function formatArea(value: number, unit: AreaUnit): string {
  const n = value >= 10 ? value.toFixed(1) : value.toFixed(2)
  const labels: Record<AreaUnit, string> = {
    acre: 'ac',
    hectare: 'ha',
    cent: 'cent',
    guntha: 'guntha',
    sqft: 'sq ft',
    sqm: 'm²',
  }
  return `${n} ${labels[unit]}`
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

export function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso + (iso.length <= 10 ? 'T00:00:00' : ''))
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '').trim()
  if (cleaned === '') return 0
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n < 0) return null
  return round2(n)
}
