'use client'

import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, Polygon, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import { parseRingJson, type LatLng } from '@/lib/geo'
import { MapSearchControl } from '@/components/MapSearchControl'
import { MapReady, OSM_ATTR, OSM_TILES } from '@/components/MapReady'

type PlotLite = {
  id: string
  name: string
  geoJson: string | null
  acres: number
}

function Fit({
  positions,
  farmRing,
}: {
  positions: LatLngExpression[][]
  farmRing: LatLng[]
}) {
  const map = useMap()
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    const farm = farmRing.map((p) => [p.lat, p.lng] as [number, number])
    const flat = farm.length ? farm : (positions.flat() as [number, number][])
    if (!flat.length) return
    map.fitBounds(flat, { padding: [28, 28] })
    done.current = true
  }, [map, positions, farmRing])
  return null
}

export function PlotMap({
  plots,
  center,
  selectedId,
  onSelect,
  farmRing = [],
  className = 'h-full min-h-[360px] w-full rounded-xl',
}: {
  plots: PlotLite[]
  center: [number, number]
  selectedId?: string
  onSelect?: (id: string) => void
  farmRing?: LatLng[]
  className?: string
}) {
  const rings = useMemo(
    () =>
      plots.map((p) => ({
        plot: p,
        positions: parseRingJson(p.geoJson).map((pt) => [pt.lat, pt.lng] as LatLngExpression),
      })),
    [plots],
  )
  return (
    <MapContainer
      center={center}
      zoom={16}
      className={className}
      style={{ height: '100%', width: '100%', minHeight: 320 }}
      scrollWheelZoom
    >
      <TileLayer attribution={OSM_ATTR} url={OSM_TILES} maxZoom={19} />
      <MapReady />
      <MapSearchControl />
      <Fit positions={rings.map((r) => r.positions)} farmRing={farmRing} />
      {farmRing.length >= 3 ? (
        <Polygon
          positions={farmRing.map((p) => [p.lat, p.lng] as LatLngExpression)}
          pathOptions={{ color: '#0a2540', weight: 2, dashArray: '6 6', fillOpacity: 0.04 }}
        >
          <Tooltip>Farm boundary</Tooltip>
        </Polygon>
      ) : null}
      {rings.map(({ plot, positions }) =>
        positions.length ? (
          <Polygon
            key={plot.id}
            positions={positions}
            pathOptions={{
              color: plot.id === selectedId ? '#635bff' : '#93c5a8',
              weight: plot.id === selectedId ? 3 : 1.5,
              fillOpacity: plot.id === selectedId ? 0.45 : 0.28,
            }}
            eventHandlers={{
              click: () => onSelect?.(plot.id),
            }}
          >
            <Tooltip>{plot.name}</Tooltip>
          </Polygon>
        ) : null,
      )}
    </MapContainer>
  )
}
