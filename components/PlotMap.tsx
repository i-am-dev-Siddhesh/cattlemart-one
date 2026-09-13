'use client'

import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Polygon, Tooltip, useMap } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import { parseRingJson, type LatLng } from '@/lib/geo'
import { MapSearchControl } from '@/components/MapSearchControl'
import { BaseLayers, BasemapToggle, MapReady, type Basemap } from '@/components/MapReady'

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
  useEffect(() => {
    const farm = farmRing.map((p) => [p.lat, p.lng] as [number, number])
    const flat = farm.length ? farm : (positions.flat() as [number, number][])
    if (!flat.length) return
    map.fitBounds(flat, { padding: [28, 28] })
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
  const [basemap, setBasemap] = useState<Basemap>('satellite')
  return (
    <div className={`map-frame relative isolate z-0 overflow-hidden ${className}`}>
      <MapContainer
        center={center}
        zoom={16}
        className="h-full w-full rounded-xl"
        style={{ height: '100%', width: '100%', minHeight: 320 }}
        scrollWheelZoom
      >
        <BaseLayers mode={basemap} />
        <MapReady />
        <MapSearchControl farmMark={{ lat: center[0], lng: center[1], label: 'Farm' }} />
        <Fit positions={rings.map((r) => r.positions)} farmRing={farmRing} />
        {farmRing.length >= 3 ? (
          <Polygon
            positions={farmRing.map((p) => [p.lat, p.lng] as LatLngExpression)}
            pathOptions={{ color: '#ffffff', weight: 2, dashArray: '6 6', fillOpacity: 0.04 }}
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
                color: plot.id === selectedId ? '#ffd166' : '#ffffff',
                weight: plot.id === selectedId ? 3 : 2,
                fillColor: plot.id === selectedId ? '#ffd166' : '#7ee0a1',
                fillOpacity: plot.id === selectedId ? 0.4 : 0.25,
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
      <BasemapToggle mode={basemap} onChange={setBasemap} />
    </div>
  )
}
