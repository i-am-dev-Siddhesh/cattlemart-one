export type LatLng = { lat: number; lng: number }

export function ringAreaAcres(ring: LatLng[]): number {
  if (ring.length < 3) return 0
  const R = 6378137
  let area = 0
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]
    const b = ring[(i + 1) % ring.length]
    area += toRad(b.lng - a.lng) * (2 + Math.sin(toRad(a.lat)) + Math.sin(toRad(b.lat)))
  }
  const m2 = Math.abs((area * R * R) / 2)
  return m2 / 4046.8564224
}

export function ringPerimeterM(ring: LatLng[]): number {
  let m = 0
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]
    const b = ring[(i + 1) % ring.length]
    m += haversine(a, b)
  }
  return m
}

function toRad(d: number) {
  return (d * Math.PI) / 180
}

function haversine(a: LatLng, b: LatLng) {
  const R = 6371000
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

export function polygonFromRing(ring: LatLng[]): GeoJSON.Polygon {
  const closed = [...ring]
  if (closed[0].lat !== closed[closed.length - 1].lat || closed[0].lng !== closed[closed.length - 1].lng) {
    closed.push(closed[0])
  }
  return {
    type: 'Polygon',
    coordinates: [closed.map((p) => [p.lng, p.lat])],
  }
}

export function ringFromGeoJson(geo: GeoJSON.Polygon | null): LatLng[] {
  if (!geo?.coordinates?.[0]) return []
  return geo.coordinates[0].map(([lng, lat]) => ({ lat, lng }))
}

export function parseRingJson(raw: string | null | undefined): LatLng[] {
  if (!raw) return []
  try {
    return ringFromGeoJson(JSON.parse(raw) as GeoJSON.Polygon)
  } catch {
    return []
  }
}

export function pointInRing(pt: LatLng, ring: LatLng[]) {
  if (ring.length < 3) return false
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].lng
    const yi = ring[i].lat
    const xj = ring[j].lng
    const yj = ring[j].lat
    const hit = yi > pt.lat !== yj > pt.lat && pt.lng < ((xj - xi) * (pt.lat - yi)) / (yj - yi || 1e-12) + xi
    if (hit) inside = !inside
  }
  return inside
}

export function ringInsideFarm(plot: LatLng[], farm: LatLng[]) {
  if (farm.length < 3) return true
  return plot.length >= 3 && plot.every((p) => pointInRing(p, farm))
}

export function envelopeRing(points: LatLng[], pad = 0.0018): LatLng[] {
  if (!points.length) return []
  const lats = points.map((p) => p.lat)
  const lngs = points.map((p) => p.lng)
  const minLat = Math.min(...lats) - pad
  const maxLat = Math.max(...lats) + pad
  const minLng = Math.min(...lngs) - pad
  const maxLng = Math.max(...lngs) + pad
  return [
    { lat: minLat, lng: minLng },
    { lat: minLat, lng: maxLng },
    { lat: maxLat, lng: maxLng },
    { lat: maxLat, lng: minLng },
  ]
}

export function farmWorkingRing(
  farm: { geoJson?: string | null; lat?: number | null; lng?: number | null },
  plots: { geoJson?: string | null }[],
): LatLng[] {
  const stored = parseRingJson(farm.geoJson)
  if (stored.length >= 3) return stored
  const fromPlots = plots.flatMap((p) => parseRingJson(p.geoJson))
  if (fromPlots.length) return envelopeRing(fromPlots, 0.0016)
  if (farm.lat != null && farm.lng != null) {
    return envelopeRing([{ lat: farm.lat, lng: farm.lng }], 0.006)
  }
  return []
}

export function farmCenter(
  farm: { lat?: number | null; lng?: number | null; geoJson?: string | null },
  plots: { geoJson?: string | null }[],
): [number, number] {
  if (farm.lat != null && farm.lng != null) return [farm.lat, farm.lng]
  const ring = farmWorkingRing(farm, plots)
  if (ring.length) {
    return [ring.reduce((s, p) => s + p.lat, 0) / ring.length, ring.reduce((s, p) => s + p.lng, 0) / ring.length]
  }
  return [20.083, 74.11]
}
