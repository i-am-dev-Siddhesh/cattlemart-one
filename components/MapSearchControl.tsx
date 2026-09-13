'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { CircleMarker, Tooltip, useMap } from 'react-leaflet'
import { Input } from '@/components/ui/input'

type Hit = { label: string; lat: number; lng: number; bbox?: number[] }

export function MapSearchControl({
  onPick,
  farmMark,
}: {
  onPick?: (hit: Hit) => void
  farmMark?: { lat: number; lng: number; label?: string } | null
}) {
  const map = useMap()
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [picked, setPicked] = useState<Hit | null>(null)
  const [note, setNote] = useState('')
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!box.current) return
    L.DomEvent.disableClickPropagation(box.current)
    L.DomEvent.disableScrollPropagation(box.current)
  }, [])

  useEffect(() => {
    const query = q.trim()
    if (query.length < 2) {
      setHits([])
      return
    }
    const t = window.setTimeout(() => {
      setBusy(true)
      fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setHits(data)
            setNote(data.length ? '' : 'No places found.')
          } else {
            setHits([])
            setNote(data.error || 'Search failed.')
          }
        })
        .catch(() => {
          setHits([])
          setNote('Search failed.')
        })
        .finally(() => setBusy(false))
    }, 350)
    return () => window.clearTimeout(t)
  }, [q])

  function go(hit: Hit) {
    setPicked(hit)
    setQ(hit.label)
    setHits([])
    setOpen(false)
    map.flyTo([hit.lat, hit.lng], 16, { duration: 0.6 })
    window.setTimeout(() => map.invalidateSize(), 200)
    onPick?.(hit)
  }

  return (
    <>
      <div ref={box} className="absolute left-3 top-3 z-[1000] w-[min(100%-24px,320px)]">
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
            setNote('')
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search village, district, pin…"
          aria-label="Search location"
        />
        {open && (hits.length || note || busy) ? (
          <div className="surface mt-1 max-h-56 overflow-auto rounded-xl p-1 text-sm shadow-lg">
            {busy ? <p className="px-3 py-2 text-muted-foreground">Searching…</p> : null}
            {note && !hits.length ? <p className="px-3 py-2 text-muted-foreground">{note}</p> : null}
            {hits.map((hit) => (
              <button
                key={`${hit.lat}-${hit.lng}-${hit.label}`}
                type="button"
                className="block w-full rounded-lg px-3 py-2 text-left hover:bg-[#eeedff]"
                onClick={() => go(hit)}
              >
                {hit.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {picked ? (
        <CircleMarker center={[picked.lat, picked.lng]} radius={8} pathOptions={{ color: '#635bff', fillOpacity: 0.9 }}>
          <Tooltip permanent>{picked.label.split(',')[0]}</Tooltip>
        </CircleMarker>
      ) : farmMark ? (
        <CircleMarker center={[farmMark.lat, farmMark.lng]} radius={8} pathOptions={{ color: '#635bff', fillOpacity: 0.9 }}>
          <Tooltip permanent>{farmMark.label || 'Farm'}</Tooltip>
        </CircleMarker>
      ) : null}
    </>
  )
}
