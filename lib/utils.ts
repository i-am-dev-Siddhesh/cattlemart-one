import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function inr(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.round(n))
}

export function acres(n: number) {
  return `${n.toFixed(2)} ac`
}

export function parseGeo(geoJson: string | null) {
  if (!geoJson) return null
  try {
    return JSON.parse(geoJson) as GeoJSON.Polygon
  } catch {
    return null
  }
}
