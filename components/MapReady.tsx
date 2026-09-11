'use client'

import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

export const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const OSM_ATTR = '&copy; OpenStreetMap'

export function MapReady() {
  const map = useMap()
  useEffect(() => {
    const fix = () => {
      map.invalidateSize()
    }
    fix()
    const ids = [80, 250, 600, 1200].map((ms) => window.setTimeout(fix, ms))
    window.addEventListener('resize', fix)
    const ro = new ResizeObserver(fix)
    ro.observe(map.getContainer())
    return () => {
      ids.forEach(clearTimeout)
      window.removeEventListener('resize', fix)
      ro.disconnect()
    }
  }, [map])
  return null
}
