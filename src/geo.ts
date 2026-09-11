import type { LngLat, Polygon } from './types'

const EARTH_RADIUS = 6378137

export function geodesicAreaSqm(polygon: Polygon | null): number {
  if (!polygon || !polygon[0] || polygon[0].length < 3) return 0
  const ring = closeRing(polygon[0])
  let area = 0
  for (let i = 0; i < ring.length - 1; i++) {
    const [lng1, lat1] = ring[i]
    const [lng2, lat2] = ring[i + 1]
    area +=
      degToRad(lng2 - lng1) *
      (2 + Math.sin(degToRad(lat1)) + Math.sin(degToRad(lat2)))
  }
  area = (area * EARTH_RADIUS * EARTH_RADIUS) / 2
  return Math.abs(area)
}

export function centroid(polygon: Polygon | null): { lat: number; lng: number } | null {
  if (!polygon || !polygon[0] || polygon[0].length === 0) return null
  const ring = polygon[0]
  let lat = 0
  let lng = 0
  for (const [x, y] of ring) {
    lng += x
    lat += y
  }
  return { lat: lat / ring.length, lng: lng / ring.length }
}

export function closeRing(ring: LngLat[]): LngLat[] {
  if (ring.length === 0) return ring
  const first = ring[0]
  const last = ring[ring.length - 1]
  if (first[0] === last[0] && first[1] === last[1]) return ring
  return [...ring, first]
}

export function latLngsToPolygon(latlngs: { lat: number; lng: number }[]): Polygon {
  const ring: LngLat[] = latlngs.map((p) => [p.lng, p.lat])
  return [closeRing(ring)]
}

export function polygonToLatLngs(polygon: Polygon): { lat: number; lng: number }[] {
  return polygon[0].map(([lng, lat]) => ({ lat, lng }))
}

export function boundsOf(polygon: Polygon | null): [[number, number], [number, number]] | null {
  if (!polygon || !polygon[0] || polygon[0].length === 0) return null
  let minLat = Infinity
  let minLng = Infinity
  let maxLat = -Infinity
  let maxLng = -Infinity
  for (const [lng, lat] of polygon[0]) {
    minLat = Math.min(minLat, lat)
    maxLat = Math.max(maxLat, lat)
    minLng = Math.min(minLng, lng)
    maxLng = Math.max(maxLng, lng)
  }
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ]
}

function degToRad(d: number): number {
  return (d * Math.PI) / 180
}
