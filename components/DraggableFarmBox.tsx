'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { Marker, Polygon, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import { pointInRing, type LatLng } from '@/lib/geo'

const VERTEX_PX = 26
const EDGE_PX = 16

function vertexIcon(index: number) {
  return L.divIcon({
    className: 'farm-vertex-handle',
    html: `<span>${index + 1}</span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

const insertIcon = L.divIcon({
  className: 'farm-edge-handle',
  html: '+',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

function nearestVertex(map: L.Map, ring: LatLng[], latlng: L.LatLng): number | null {
  const cursor = map.latLngToContainerPoint(latlng)
  let best = -1
  let bestD = VERTEX_PX
  ring.forEach((p, i) => {
    const d = cursor.distanceTo(map.latLngToContainerPoint(L.latLng(p.lat, p.lng)))
    if (d <= bestD) {
      bestD = d
      best = i
    }
  })
  return best >= 0 ? best : null
}

function nearestEdge(map: L.Map, ring: LatLng[], latlng: L.LatLng): { insertAt: number; point: LatLng } | null {
  if (ring.length < 2) return null
  const cursor = map.latLngToContainerPoint(latlng)
  let best: { insertAt: number; point: LatLng; dist: number } | null = null
  for (let i = 0; i < ring.length; i++) {
    const a = map.latLngToContainerPoint(L.latLng(ring[i].lat, ring[i].lng))
    const b = map.latLngToContainerPoint(L.latLng(ring[(i + 1) % ring.length].lat, ring[(i + 1) % ring.length].lng))
    const ab = b.subtract(a)
    const len2 = ab.x * ab.x + ab.y * ab.y
    if (len2 < 1) continue
    const t = Math.max(0, Math.min(1, ((cursor.x - a.x) * ab.x + (cursor.y - a.y) * ab.y) / len2))
    const proj = L.point(a.x + ab.x * t, a.y + ab.y * t)
    const dist = cursor.distanceTo(proj)
    if (dist > EDGE_PX) continue
    if (t < 0.12 || t > 0.88) continue
    if (best && dist >= best.dist) continue
    const ll = map.containerPointToLatLng(proj)
    best = { insertAt: i + 1, point: { lat: ll.lat, lng: ll.lng }, dist }
  }
  return best ? { insertAt: best.insertAt, point: best.point } : null
}

function edgeMid(a: LatLng, b: LatLng): LatLng {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 }
}

export function DraggableFarmBox({
  ring,
  editable,
  onRing,
  onMoved,
  onVertex,
  onReject,
  onEditStart,
}: {
  ring: LatLng[]
  editable: boolean
  onRing: (next: LatLng[]) => void
  onMoved: (next: LatLng[]) => void
  onVertex: (pt: LatLng) => void
  onReject: () => void
  onEditStart: () => void
}) {
  const map = useMap()
  const drag = useRef<{ from: LatLng; ring: LatLng[] } | null>(null)
  const corner = useRef<number | null>(null)
  const moved = useRef(false)
  const ringRef = useRef(ring)
  const onRingRef = useRef(onRing)
  const onMovedRef = useRef(onMoved)
  const onEditStartRef = useRef(onEditStart)

  useEffect(() => {
    ringRef.current = ring
  }, [ring])
  useEffect(() => {
    onRingRef.current = onRing
    onMovedRef.current = onMoved
    onEditStartRef.current = onEditStart
  }, [onRing, onMoved, onEditStart])

  function setRingNow(next: LatLng[]) {
    ringRef.current = next
    onRingRef.current(next)
  }

  function beginVertex(index: number) {
    onEditStartRef.current()
    map.dragging.disable()
    map.getContainer().style.cursor = 'grabbing'
    moved.current = false
    drag.current = null
    corner.current = index
  }

  function insertVertex(insertAt: number, point: LatLng) {
    const next = [...ringRef.current.slice(0, insertAt), point, ...ringRef.current.slice(insertAt)]
    setRingNow(next)
    moved.current = true
    beginVertex(insertAt)
  }

  function deleteVertex(index: number) {
    if (ringRef.current.length <= 3) return
    onEditStartRef.current()
    const next = ringRef.current.filter((_, i) => i !== index)
    drag.current = null
    corner.current = null
    moved.current = true
    map.dragging.enable()
    map.getContainer().style.cursor = ''
    setRingNow(next)
    onMovedRef.current(next)
  }

  function applyMove(ev: MouseEvent) {
    const latlng = map.mouseEventToLatLng(ev)
    if (corner.current != null) {
      moved.current = true
      setRingNow(ringRef.current.map((p, i) => (i === corner.current ? { lat: latlng.lat, lng: latlng.lng } : p)))
      return
    }
    if (!drag.current) return
    moved.current = true
    const dLat = latlng.lat - drag.current.from.lat
    const dLng = latlng.lng - drag.current.from.lng
    setRingNow(drag.current.ring.map((p) => ({ lat: p.lat + dLat, lng: p.lng + dLng })))
  }

  function release() {
    map.dragging.enable()
    map.getContainer().style.cursor = ''
    const didEdit = moved.current
    drag.current = null
    corner.current = null
    if (didEdit) onMovedRef.current(ringRef.current)
  }

  useEffect(() => {
    function move(ev: MouseEvent) {
      if (corner.current == null && !drag.current) return
      ev.preventDefault()
      applyMove(ev)
    }
    function up() {
      if (corner.current == null && !drag.current) return
      release()
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
  }, [map])

  useMapEvents({
    mousedown(e) {
      if (!editable) return
      const vertex = nearestVertex(map, ringRef.current, e.latlng)
      if (vertex != null) {
        L.DomEvent.stop(e)
        beginVertex(vertex)
        return
      }
      const edge = nearestEdge(map, ringRef.current, e.latlng)
      if (!edge) return
      L.DomEvent.stop(e)
      insertVertex(edge.insertAt, { lat: e.latlng.lat, lng: e.latlng.lng })
    },
    click(e) {
      if (editable) return
      if (moved.current) {
        moved.current = false
        return
      }
      const pt = { lat: e.latlng.lat, lng: e.latlng.lng }
      const box = ringRef.current
      if (box.length >= 3 && !pointInRing(pt, box)) onReject()
      else onVertex(pt)
    },
    dblclick(e) {
      if (!editable) return
      const vertex = nearestVertex(map, ringRef.current, e.latlng)
      if (vertex == null) return
      L.DomEvent.stop(e)
      deleteVertex(vertex)
    },
    contextmenu(e) {
      if (!editable) return
      const vertex = nearestVertex(map, ringRef.current, e.latlng)
      if (vertex == null) return
      L.DomEvent.stop(e)
      e.originalEvent?.preventDefault()
      deleteVertex(vertex)
    },
  })

  const positions = ring.length >= 3 ? ring.map((p) => [p.lat, p.lng] as LatLngExpression) : []

  return (
    <>
      <Polygon
        positions={positions.length ? positions : [[0, 0] as LatLngExpression]}
        pathOptions={{
          color: '#fbbf24',
          weight: 2.5,
          dashArray: '6 6',
          fillColor: '#fbbf24',
          fillOpacity: positions.length ? 0.06 : 0,
          opacity: positions.length ? 1 : 0,
        }}
        eventHandlers={{
          mousedown: (e) => {
            if (!editable) return
            if (nearestVertex(map, ringRef.current, e.latlng) != null) return
            if (nearestEdge(map, ringRef.current, e.latlng)) return
            e.originalEvent?.preventDefault()
            onEditStart()
            map.dragging.disable()
            map.getContainer().style.cursor = 'move'
            moved.current = false
            corner.current = null
            drag.current = {
              from: { lat: e.latlng.lat, lng: e.latlng.lng },
              ring: ringRef.current.map((p) => ({ ...p })),
            }
          },
        }}
      >
        <Tooltip>
          {editable
            ? 'Drag a numbered corner. Click + to add. Right-click or double-click a number to delete.'
            : 'Saved farm boundary'}
        </Tooltip>
      </Polygon>
      {editable
        ? ring.map((p, i) => {
        const next = ring[(i + 1) % ring.length]
        return (
          <Marker
            key={`farm-edge-${i}`}
            position={[edgeMid(p, next).lat, edgeMid(p, next).lng]}
            icon={insertIcon}
            interactive={false}
            keyboard={false}
            zIndexOffset={700}
          />
        )
          })
        : null}
      {editable ? ring.map((p, i) => (
        <Marker
          key={`farm-corner-${i}`}
          position={[p.lat, p.lng]}
          icon={vertexIcon(i)}
          interactive={false}
          keyboard={false}
          zIndexOffset={800}
        />
      )) : null}
    </>
  )
}
