'use client'

import { useEffect, useRef } from 'react'
import { CircleMarker, Polygon, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import type { LatLng } from '@/lib/geo'

export function EditablePlotRing({
  ring,
  onChange,
  onDragStart,
}: {
  ring: LatLng[]
  onChange: (next: LatLng[]) => void
  onDragStart: () => void
}) {
  const map = useMap()
  const ringRef = useRef(ring)
  const vertex = useRef<number | null>(null)
  const body = useRef<{ from: LatLng; ring: LatLng[] } | null>(null)

  useEffect(() => {
    ringRef.current = ring
  }, [ring])

  useMapEvents({
    mousemove(e) {
      if (vertex.current != null) {
        const next = ringRef.current.map((p, i) => (i === vertex.current ? { lat: e.latlng.lat, lng: e.latlng.lng } : p))
        onChange(next)
        return
      }
      if (body.current) {
        const dLat = e.latlng.lat - body.current.from.lat
        const dLng = e.latlng.lng - body.current.from.lng
        onChange(body.current.ring.map((p) => ({ lat: p.lat + dLat, lng: p.lng + dLng })))
      }
    },
    mouseup() {
      if (vertex.current == null && !body.current) return
      vertex.current = null
      body.current = null
      map.dragging.enable()
      map.getContainer().style.cursor = ''
    },
  })

  if (ring.length < 1) return null

  return (
    <>
      {ring.length >= 2 ? (
        <Polygon
          positions={ring.map((p) => [p.lat, p.lng] as LatLngExpression)}
          pathOptions={{ color: '#635bff', weight: 2, fillOpacity: 0.18 }}
          eventHandlers={{
            mousedown: (e) => {
              e.originalEvent?.preventDefault()
              e.originalEvent?.stopPropagation()
              onDragStart()
              map.dragging.disable()
              map.getContainer().style.cursor = 'move'
              body.current = {
                from: { lat: e.latlng.lat, lng: e.latlng.lng },
                ring: ringRef.current.map((p) => ({ ...p })),
              }
            },
          }}
        >
          <Tooltip>Drag the shape to move it. Drag a white dot to move a corner.</Tooltip>
        </Polygon>
      ) : null}
      {ring.map((p, i) => (
        <CircleMarker
          key={`corner-${i}`}
          center={[p.lat, p.lng]}
          radius={8}
          pathOptions={{ color: '#635bff', fillColor: '#ffffff', fillOpacity: 1, weight: 2 }}
          eventHandlers={{
            mousedown: (e) => {
              e.originalEvent?.preventDefault()
              e.originalEvent?.stopPropagation()
              onDragStart()
              map.dragging.disable()
              map.getContainer().style.cursor = 'grabbing'
              vertex.current = i
            },
          }}
        >
          <Tooltip>Drag corner {i + 1}</Tooltip>
        </CircleMarker>
      ))}
    </>
  )
}
