'use client'

import { useEffect } from 'react'
import { TileLayer, useMap } from 'react-leaflet'

export const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const OSM_ATTR = '&copy; OpenStreetMap'

const SAT_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const SAT_LABELS =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
const SAT_ATTR = 'Imagery &copy; Esri, Maxar, Earthstar Geographics'
/** Esri serves a "Map data not yet available" placeholder past 18 over rural India, so upscale from 18 instead. */
const SAT_NATIVE_ZOOM = 18

export type Basemap = 'satellite' | 'streets'

/** Satellite shows the real fields; streets is the plain road map. */
export function BaseLayers({ mode }: { mode: Basemap }) {
  if (mode === 'streets') {
    return <TileLayer url={OSM_TILES} attribution={OSM_ATTR} maxZoom={19} />
  }
  return (
    <>
      <TileLayer url={SAT_TILES} attribution={SAT_ATTR} maxZoom={20} maxNativeZoom={SAT_NATIVE_ZOOM} />
      <TileLayer url={SAT_LABELS} maxZoom={20} maxNativeZoom={SAT_NATIVE_ZOOM} opacity={0.9} />
    </>
  )
}

export function BasemapToggle({ mode, onChange }: { mode: Basemap; onChange: (next: Basemap) => void }) {
  return (
    <div className="absolute top-3 right-3 z-10 flex overflow-hidden rounded-lg border border-border bg-white text-xs font-semibold shadow">
      {(['satellite', 'streets'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`px-3 py-1.5 capitalize ${mode === m ? 'bg-primary text-white' : 'text-muted-foreground'}`}
        >
          {m === 'satellite' ? 'Satellite' : 'Map'}
        </button>
      ))}
    </div>
  )
}

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
