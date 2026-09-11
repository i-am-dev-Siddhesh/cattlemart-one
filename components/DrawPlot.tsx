'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MapContainer, TileLayer, Polygon, Tooltip } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import { createPlotAction, setFarmLocationAction } from '@/lib/actions'
import { envelopeRing, farmCenter, farmWorkingRing, parseRingJson, ringAreaAcres, type LatLng } from '@/lib/geo'
import { MapSearchControl } from '@/components/MapSearchControl'
import { MapReady, OSM_ATTR, OSM_TILES } from '@/components/MapReady'
import { DraggableFarmBox } from '@/components/DraggableFarmBox'
import { EditablePlotRing } from '@/components/EditablePlotRing'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

function ringCenter(ring: LatLng[]): LatLng {
  return {
    lat: ring.reduce((s, p) => s + p.lat, 0) / ring.length,
    lng: ring.reduce((s, p) => s + p.lng, 0) / ring.length,
  }
}

export function DrawPlot({
  farmId,
  center,
  crops,
  plots = [],
  farm,
}: {
  farmId: string
  center: [number, number]
  crops: { id: string; name: string }[]
  plots?: { id: string; name: string; geoJson: string | null }[]
  farm?: { geoJson?: string | null; lat?: number | null; lng?: number | null }
}) {
  const [ring, setRing] = useState<LatLng[]>([])
  const [outside, setOutside] = useState(false)
  const [error, setError] = useState('')
  const [located, setLocated] = useState<LatLng[] | null>(null)
  const [place, setPlace] = useState('')
  const [pending, start] = useTransition()
  const skipAdd = useRef(false)
  const router = useRouter()
  const storedRing = useMemo(() => farmWorkingRing(farm ?? {}, plots), [farm, plots])
  const mapCenter = farmCenter(farm ?? { lat: center[0], lng: center[1] }, plots)
  const farmRing =
    located ?? (storedRing.length >= 3 ? storedRing : envelopeRing([{ lat: mapCenter[0], lng: mapCenter[1] }], 0.008))
  const acres = ring.length >= 3 ? ringAreaAcres(ring) : 0

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="relative h-[480px] overflow-hidden rounded-xl border border-border">
        <MapContainer center={mapCenter} zoom={16} className="h-full w-full" style={{ height: '100%', width: '100%' }}>
          <TileLayer url={OSM_TILES} attribution={OSM_ATTR} maxZoom={19} />
          <MapReady />
          <MapSearchControl
            onPick={(hit) => {
              const outline = envelopeRing([{ lat: hit.lat, lng: hit.lng }], 0.008)
              setLocated(outline)
              setPlace(hit.label)
              setOutside(false)
              setRing([])
              start(async () => {
                await setFarmLocationAction({ farmId, lat: hit.lat, lng: hit.lng, label: hit.label })
              })
            }}
          />
          <DraggableFarmBox
            ring={farmRing}
            onRing={(next) => {
              setLocated(next)
              setOutside(false)
            }}
            onMoved={(next) => {
              const mid = ringCenter(next)
              start(async () => {
                await setFarmLocationAction({ farmId, lat: mid.lat, lng: mid.lng, ring: next })
              })
            }}
            onVertex={(p) => {
              if (skipAdd.current) {
                skipAdd.current = false
                return
              }
              setOutside(false)
              setRing((r) => [...r, p])
            }}
            onReject={() => setOutside(true)}
            onEditStart={() => {
              skipAdd.current = true
            }}
          />
          {plots.map((p) => {
            const pts = parseRingJson(p.geoJson)
            if (pts.length < 3) return null
            return (
              <Polygon
                key={p.id}
                positions={pts.map((pt) => [pt.lat, pt.lng] as LatLngExpression)}
                pathOptions={{ color: '#93c5a8', weight: 1.5, fillOpacity: 0.22 }}
              >
                <Tooltip>{p.name}</Tooltip>
              </Polygon>
            )
          })}
          <EditablePlotRing
            ring={ring}
            onChange={setRing}
            onDragStart={() => {
              skipAdd.current = true
            }}
          />
        </MapContainer>
      </div>
      <Card>
        <form
          className="space-y-4 text-sm"
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            setError('')
            start(async () => {
              try {
                const id = await createPlotAction({
                  farmId,
                  name: String(fd.get('name')),
                  code: String(fd.get('code')),
                  ring,
                  irrigation: String(fd.get('irrigation') || ''),
                  soilType: String(fd.get('soilType') || ''),
                  cropId: String(fd.get('cropId') || '') || undefined,
                  leaveUnplanted: fd.get('unplanted') === 'on',
                  startDate: String(fd.get('startDate') || ''),
                  endDate: String(fd.get('endDate') || ''),
                })
                router.push(`/app/farms/${farmId}/plots/${id}`)
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not save plot.')
              }
            })
          }}
        >
          <p className="text-base font-semibold">Draw plot on this farm</p>
          <p className="text-muted-foreground">
            Farm corners are numbered. Drag a number to move it. Click + on an edge to add a vertex. Right-click or double-click a number to delete it (at least 3 corners stay). Drag the fill to move the farm. Click inside to draw a plot.
          </p>
          {place ? <p className="text-sm text-primary">Farm location: {place.split(',')[0]}</p> : null}
          {outside ? (
            <p className="text-sm text-destructive">Drag the dashed box here first, then click inside it.</p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <p className="num text-sm">
            Area {acres.toFixed(2)} acres · {ring.length} vertices
          </p>
          <Button type="button" variant="ghost" onClick={() => setRing([])}>
            Clear
          </Button>
          <Field label="Name">
            <Input name="name" required placeholder="Plot 05" />
          </Field>
          <Field label="Code">
            <Input name="code" required placeholder="05" />
          </Field>
          <Field label="Irrigation">
            <Input name="irrigation" placeholder="Drip" />
          </Field>
          <Field label="Soil">
            <Input name="soilType" placeholder="Red loam" />
          </Field>
          <Field label="Current crop">
            <Select name="cropId">
              <option value="">Leave unplanted</option>
              {crops.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cycle start">
            <Input name="startDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </Field>
          <Field label="Cycle end">
            <Input name="endDate" type="date" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="unplanted" /> Leave unplanted
          </label>
          <Button disabled={pending || ring.length < 3} className="w-full">
            {pending ? 'Saving…' : 'Create plot on this farm'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
