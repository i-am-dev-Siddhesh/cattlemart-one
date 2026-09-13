import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isNextNavigationError(err: unknown) {
  if (!err || typeof err !== 'object') return false
  const digest = 'digest' in err ? String((err as { digest?: unknown }).digest ?? '') : ''
  const message = err instanceof Error ? err.message : ''
  return (
    digest.startsWith('NEXT_REDIRECT') ||
    digest.startsWith('NEXT_NOT_FOUND') ||
    message === 'NEXT_REDIRECT' ||
    message === 'NEXT_NOT_FOUND'
  )
}

export function userFacingActionError(err: unknown) {
  const type = err && typeof err === 'object' && 'type' in err ? String((err as { type?: unknown }).type) : ''
  const message = err instanceof Error ? err.message : ''
  if (type === 'CredentialsSignin' || /credentialssignin/i.test(message) || /errors\.authjs\.dev/i.test(message)) {
    return 'Email or password is not right.'
  }
  if (message && !message.startsWith('NEXT_') && !/https?:\/\//i.test(message)) return message
  return 'That did not save. Try again.'
}

export function inr(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.round(n))
}

/** Short money for chart axes and chips: ₹0, ₹4.5k, ₹1.2L. */
export function inrShort(n: number) {
  const v = Math.round(n)
  if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(1)}L`
  if (Math.abs(v) >= 1000) return `₹${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`
  return `₹${v}`
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
