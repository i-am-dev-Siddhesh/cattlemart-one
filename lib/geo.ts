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
  const ring = geo.coordinates[0].map(([lng, lat]) => ({ lat, lng }))
  if (
    ring.length > 1 &&
    ring[0].lat === ring[ring.length - 1].lat &&
    ring[0].lng === ring[ring.length - 1].lng
  ) {
    ring.pop()
  }
  return ring
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

function pointOnRing(pt: LatLng, ring: LatLng[]) {
  const epsilon = 1e-10
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]
    const b = ring[(i + 1) % ring.length]
    const cross = (pt.lat - a.lat) * (b.lng - a.lng) - (pt.lng - a.lng) * (b.lat - a.lat)
    if (Math.abs(cross) > epsilon) continue
    if (
      pt.lat >= Math.min(a.lat, b.lat) - epsilon &&
      pt.lat <= Math.max(a.lat, b.lat) + epsilon &&
      pt.lng >= Math.min(a.lng, b.lng) - epsilon &&
      pt.lng <= Math.max(a.lng, b.lng) + epsilon
    ) {
      return true
    }
  }
  return false
}

export function ringInsideFarm(plot: LatLng[], farm: LatLng[]) {
  if (farm.length < 3) return true
  if (plot.length < 3 || !plot.every((p) => pointInRing(p, farm) || pointOnRing(p, farm))) return false
  for (let i = 0; i < plot.length; i++) {
    const a = plot[i]
    const b = plot[(i + 1) % plot.length]
    for (let j = 0; j < farm.length; j++) {
      const c = farm[j]
      const d = farm[(j + 1) % farm.length]
      if (segmentsCross(a, b, c, d)) return false
    }
  }
  return true
}

export function ringCentroid(ring: LatLng[]): LatLng {
  return {
    lat: ring.reduce((s, p) => s + p.lat, 0) / ring.length,
    lng: ring.reduce((s, p) => s + p.lng, 0) / ring.length,
  }
}

/** Pull corners slightly inward so plots that merely share a border are not treated as overlapping. */
function shrinkRing(ring: LatLng[], factor = 0.97): LatLng[] {
  const c = ringCentroid(ring)
  return ring.map((p) => ({
    lat: c.lat + (p.lat - c.lat) * factor,
    lng: c.lng + (p.lng - c.lng) * factor,
  }))
}

function segmentsCross(a: LatLng, b: LatLng, c: LatLng, d: LatLng) {
  const side = (p: LatLng, q: LatLng, r: LatLng) =>
    Math.sign((q.lng - p.lng) * (r.lat - p.lat) - (q.lat - p.lat) * (r.lng - p.lng))
  const d1 = side(a, b, c)
  const d2 = side(a, b, d)
  const d3 = side(c, d, a)
  const d4 = side(c, d, b)
  return d1 !== d2 && d3 !== d4 && d1 !== 0 && d2 !== 0 && d3 !== 0 && d4 !== 0
}

export function ringsOverlap(a: LatLng[], b: LatLng[]) {
  if (a.length < 3 || b.length < 3) return false
  const sa = shrinkRing(a)
  const sb = shrinkRing(b)
  if (sa.some((p) => pointInRing(p, b))) return true
  if (sb.some((p) => pointInRing(p, a))) return true
  for (let i = 0; i < sa.length; i++) {
    const a1 = sa[i]
    const a2 = sa[(i + 1) % sa.length]
    for (let j = 0; j < sb.length; j++) {
      const b1 = sb[j]
      const b2 = sb[(j + 1) % sb.length]
      if (segmentsCross(a1, a2, b1, b2)) return true
    }
  }
  return false
}

export function overlappingPlots<T extends { geoJson?: string | null }>(ring: LatLng[], plots: T[]): T[] {
  if (ring.length < 3) return []
  return plots.filter((p) => ringsOverlap(ring, parseRingJson(p.geoJson)))
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

/** Point sent to weather APIs: farm polygon centre, else plot envelope, else stored lat/lng. */
export function weatherPoint(
  farm: { lat?: number | null; lng?: number | null; geoJson?: string | null },
  plots: { geoJson?: string | null }[],
): { lat: number; lng: number; source: 'farm_boundary' | 'plot_boundaries' | 'farm_pin' } | null {
  const farmRing = parseRingJson(farm.geoJson)
  if (farmRing.length >= 3) {
    const c = ringCentroid(farmRing)
    return { ...c, source: 'farm_boundary' }
  }
  const plotPts = plots.flatMap((p) => parseRingJson(p.geoJson))
  if (plotPts.length) {
    const c = ringCentroid(envelopeRing(plotPts, 0.0016))
    return { ...c, source: 'plot_boundaries' }
  }
  if (farm.lat != null && farm.lng != null) {
    return { lat: farm.lat, lng: farm.lng, source: 'farm_pin' }
  }
  return null
}
