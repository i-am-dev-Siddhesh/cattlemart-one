export type GeoPlace = {
  lat: number
  lng: number
  label: string
  village?: string
  district?: string
  state?: string
}

const UA = 'CattlemartOne/1.0 (farm location)'

const POI = /vidyalay|vidyalaya|school|college|hospital|office|mandir|temple|hotel|ashram/i

export function isPoiName(name?: string | null) {
  return Boolean(name && POI.test(name))
}

function settlement(addr: Record<string, string> | undefined) {
  if (!addr) return undefined
  return [addr.village, addr.hamlet, addr.town, addr.city].find((n) => n && !isPoiName(n))
}

function districtOf(addr: Record<string, string> | undefined) {
  if (!addr) return undefined
  return addr.state_district || addr.county
}

function fromAddress(addr: Record<string, string> | undefined, fallback: string) {
  const village = settlement(addr)
  const district = districtOf(addr)
  const state = addr?.state
  return {
    label: [village, district, state].filter(Boolean).join(', ') || fallback,
    village,
    district,
    state,
  }
}

export function farmLocationLabel(farm: {
  village?: string | null
  district?: string | null
  state?: string | null
  country?: string | null
}) {
  const village = isPoiName(farm.village) ? null : farm.village
  const parts = [village, farm.district, farm.state].filter(Boolean)
  if (village && farm.district && village.toLowerCase() === farm.district.toLowerCase()) {
    return [farm.district, farm.state].filter(Boolean).join(', ')
  }
  return parts.join(', ') || farm.country || 'Set location on map'
}

export async function searchPlace(q: string): Promise<GeoPlace | null> {
  const query = q.trim()
  if (query.length < 2) return null
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '1')
  url.searchParams.set('countrycodes', 'in')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('q', query)
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-IN,en' } })
  if (!res.ok) return null
  const rows = (await res.json()) as {
    display_name: string
    lat: string
    lon: string
    address?: Record<string, string>
  }[]
  const row = rows[0]
  if (!row) return null
  return { lat: Number(row.lat), lng: Number(row.lon), ...fromAddress(row.address, row.display_name) }
}

export async function reversePlace(lat: number, lng: number): Promise<GeoPlace | null> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lng))
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('zoom', '16')
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-IN,en' } })
  if (!res.ok) return null
  const row = (await res.json()) as { display_name?: string; address?: Record<string, string> }
  if (!row.display_name) return null
  return { lat, lng, ...fromAddress(row.address, row.display_name) }
}
