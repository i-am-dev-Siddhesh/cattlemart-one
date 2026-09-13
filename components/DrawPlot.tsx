'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MapContainer, Polygon, Tooltip, ZoomControl } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import { Check, Loader2, MapPin, Pencil, RotateCcw, Trash2, TriangleAlert } from 'lucide-react'
import { createPlotAction, deletePlotAction, setFarmLocationAction, updatePlotShapeAction } from '@/lib/actions'
import { CropPicker } from '@/components/CropPicker'
import { useFeedback } from '@/components/feedback'
import {
  envelopeRing,
  farmCenter,
  farmWorkingRing,
  overlappingPlots,
  parseRingJson,
  ringAreaAcres,
  ringCentroid,
  ringInsideFarm,
  type LatLng,
} from '@/lib/geo'
import { MapSearchControl } from '@/components/MapSearchControl'
import { BaseLayers, BasemapToggle, MapReady, type Basemap } from '@/components/MapReady'
import { DraggableFarmBox } from '@/components/DraggableFarmBox'
import { EditablePlotRing } from '@/components/EditablePlotRing'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

type PlotShape = {
  id: string
  name: string
  code: string
  geoJson: string | null
  irrigation?: string | null
  soilType?: string | null
  status?: string | null
}

export function DrawPlot({
  farmId,
  center,
  crops,
  plots = [],
  farm,
  nextCode = '01',
  editPlotId,
}: {
  farmId: string
  center: [number, number]
  crops: { id: string; name: string }[]
  plots?: PlotShape[]
  farm?: { geoJson?: string | null; lat?: number | null; lng?: number | null }
  nextCode?: string
  editPlotId?: string
}) {
  const [ring, setRing] = useState<LatLng[]>([])
  const [editing, setEditing] = useState<PlotShape | null>(null)
  const savedBoundary = useMemo(() => parseRingJson(farm?.geoJson), [farm?.geoJson])
  const suggestedBoundary = useMemo(
    () =>
      savedBoundary.length >= 3
        ? savedBoundary
        : farmWorkingRing(farm ?? {}, plots).length >= 3
          ? farmWorkingRing(farm ?? {}, plots)
          : envelopeRing([{ lat: center[0], lng: center[1] }], 0.008),
    [center, farm, plots, savedBoundary],
  )
  const [farmRing, setFarmRing] = useState<LatLng[]>(suggestedBoundary)
  const [committedBoundary, setCommittedBoundary] = useState<LatLng[]>(suggestedBoundary)
  const [boundaryEditing, setBoundaryEditing] = useState(false)
  const [hasSavedBoundary, setHasSavedBoundary] = useState(savedBoundary.length >= 3)
  const [outside, setOutside] = useState(false)
  const [error, setError] = useState('')
  const [place, setPlace] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [askDelete, setAskDelete] = useState(false)
  const [basemap, setBasemap] = useState<Basemap>('satellite')
  const [pending, start] = useTransition()
  const { run } = useFeedback()
  const skipAdd = useRef(false)
  const opened = useRef<string | null>(null)
  const router = useRouter()
  const mapCenter = farmCenter(farm ?? { lat: center[0], lng: center[1] }, plots)
  const acres = ring.length >= 3 ? ringAreaAcres(ring) : 0

  const others = useMemo(() => plots.filter((p) => p.id !== editing?.id), [plots, editing])
  const clash = useMemo(() => overlappingPlots(ring, others), [ring, others])
  const plotOutside = ring.length >= 3 && !ringInsideFarm(ring, farmRing)
  const boundaryOutsidePlots = useMemo(
    () => plots.filter((plot) => !ringInsideFarm(parseRingJson(plot.geoJson), farmRing)),
    [farmRing, plots],
  )
  const ready = hasSavedBoundary && ring.length >= 3 && !clash.length && !plotOutside
  const boundaryAcres = ringAreaAcres(boundaryEditing ? farmRing : committedBoundary)
  const plottedAcres = useMemo(
    () => plots.reduce((sum, plot) => sum + ringAreaAcres(parseRingJson(plot.geoJson)), 0),
    [plots],
  )
  const freeAcres = Math.max(boundaryAcres - plottedAcres, 0)

  function beginEdit(plot: PlotShape) {
    skipAdd.current = true
    setEditing(plot)
    setRing(parseRingJson(plot.geoJson))
    setOutside(false)
    setError('')
    setAskDelete(false)
  }

  function cancelEdit() {
    setEditing(null)
    setRing([])
    setError('')
    setAskDelete(false)
  }

  function beginBoundaryEdit(next = committedBoundary) {
    cancelEdit()
    setFarmRing(next.map((point) => ({ ...point })))
    setBoundaryEditing(true)
    setOutside(false)
  }

  function cancelBoundaryEdit() {
    setFarmRing(committedBoundary.map((point) => ({ ...point })))
    setBoundaryEditing(false)
    setOutside(false)
  }

  useEffect(() => {
    if (!editPlotId || opened.current === editPlotId) return
    const plot = plots.find((p) => p.id === editPlotId)
    if (!plot) return
    opened.current = editPlotId
    beginEdit(plot)
  }, [editPlotId, plots])

  const step = clash.length
    ? {
        tone: 'warn' as const,
        text: `This shape is on top of ${clash.map((p) => p.name).join(', ')}. Move it to open land.`,
      }
    : plotOutside || outside
      ? { tone: 'warn' as const, text: 'The whole plot must stay inside the saved farm boundary.' }
      : !hasSavedBoundary
        ? { tone: 'warn' as const, text: 'Set and save the farm boundary before drawing a plot.' }
      : ring.length === 0
        ? { tone: 'info' as const, text: 'Click inside the dashed box to drop the first corner.' }
        : ring.length < 3
          ? { tone: 'info' as const, text: `Add ${3 - ring.length} more corner${3 - ring.length === 1 ? '' : 's'}.` }
          : editing
            ? { tone: 'ok' as const, text: 'Drag corners to fix the shape, then save changes.' }
            : { tone: 'ok' as const, text: 'Shape looks good. Name it below and save.' }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="map-frame relative isolate z-0 h-[min(62vh,420px)] overflow-hidden rounded-xl border border-border lg:h-[560px]">
        <MapContainer
          center={mapCenter}
          zoom={16}
          zoomControl={false}
          className="h-full w-full"
          style={{ height: '100%', width: '100%' }}
        >
          <BaseLayers mode={basemap} />
          <ZoomControl position="bottomright" />
          <MapReady />
          <MapSearchControl
            farmMark={
              farm?.lat != null && farm?.lng != null
                ? { lat: farm.lat, lng: farm.lng, label: place.split(',')[0] || 'Farm' }
                : { lat: mapCenter[0], lng: mapCenter[1], label: 'Farm' }
            }
            onPick={(hit) => {
              const outline = envelopeRing([{ lat: hit.lat, lng: hit.lng }], 0.008)
              setPlace(hit.label)
              setOutside(false)
              beginBoundaryEdit(outline)
            }}
          />
          <DraggableFarmBox
            ring={farmRing}
            editable={boundaryEditing}
            onRing={(next) => {
              setFarmRing(next)
              setOutside(false)
            }}
            onMoved={setFarmRing}
            onVertex={(p) => {
              if (skipAdd.current) {
                skipAdd.current = false
                return
              }
              if (editing || boundaryEditing || !hasSavedBoundary) return
              setOutside(false)
              setRing((r) => [...r, p])
            }}
            onReject={() => setOutside(true)}
            onEditStart={() => setOutside(false)}
          />
          {others.map((p) => {
            const pts = parseRingJson(p.geoJson)
            if (pts.length < 3) return null
            const hit = clash.some((c) => c.id === p.id)
            return (
              <Polygon
                key={p.id}
                positions={pts.map((pt) => [pt.lat, pt.lng] as LatLngExpression)}
                pathOptions={
                  hit
                    ? { color: '#ffffff', weight: 2.5, fillColor: '#e11d48', fillOpacity: 0.45 }
                    : { color: '#ffffff', weight: 2, fillColor: '#7ee0a1', fillOpacity: 0.3 }
                }
                eventHandlers={{
                  click: (e) => {
                    e.originalEvent?.stopPropagation()
                    if (!boundaryEditing) beginEdit(p)
                  },
                }}
              >
                <Tooltip>{hit ? `${p.name} — already taken` : `${p.name} · click to edit`}</Tooltip>
              </Polygon>
            )
          })}
          {!boundaryEditing ? (
            <EditablePlotRing
              ring={ring}
              onChange={setRing}
              onDragStart={() => {
                skipAdd.current = true
              }}
            />
          ) : null}
        </MapContainer>
        <BasemapToggle mode={basemap} onChange={setBasemap} />
      </div>

      <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Farm boundary</p>
              <p className="text-base font-semibold">
                {boundaryEditing ? 'Move the boundary corners' : hasSavedBoundary ? 'Boundary saved' : 'Boundary not saved'}
              </p>
            </div>
            {!boundaryEditing && hasSavedBoundary ? (
              <span className="flex items-center gap-1 text-xs font-medium text-[#166534]">
                <Check className="h-3.5 w-3.5" /> Saved
              </span>
            ) : null}
          </div>
          {boundaryEditing || hasSavedBoundary ? (
            <div className="mt-3 rounded-lg bg-[#f6f9fc] p-3">
              <p className="text-xs font-medium text-muted-foreground">Total land</p>
              <p className="num text-2xl font-semibold">{boundaryAcres.toFixed(2)} acres</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {plottedAcres.toFixed(2)} ac in {plots.length} plot{plots.length === 1 ? '' : 's'} ·{' '}
                {freeAcres.toFixed(2)} ac free
              </p>
            </div>
          ) : null}
          {boundaryEditing ? (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                Drag a numbered corner, drag the whole boundary, or use + between corners.
              </p>
              {boundaryOutsidePlots.length ? (
                <p className="mt-2 text-sm text-destructive">
                  Keep these plots inside: {boundaryOutsidePlots.map((plot) => plot.name).join(', ')}.
                </p>
              ) : null}
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  className="flex-1"
                  disabled={pending || farmRing.length < 3 || boundaryOutsidePlots.length > 0}
                  onClick={() => {
                    const mid = ringCentroid(farmRing)
                    start(async () => {
                      const result = await run(
                        () =>
                          setFarmLocationAction({
                            farmId,
                            lat: mid.lat,
                            lng: mid.lng,
                            label: place || undefined,
                            ring: farmRing,
                          }),
                        { ok: 'Farm boundary saved' },
                      )
                      if (!result.ok) return
                      setCommittedBoundary(farmRing.map((point) => ({ ...point })))
                      setHasSavedBoundary(true)
                      setBoundaryEditing(false)
                      router.refresh()
                    })
                  }}
                >
                  {pending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                    </>
                  ) : (
                    'Save boundary'
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={cancelBoundaryEdit}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                Plots can only be drawn and moved inside this saved outline.
              </p>
              <Button type="button" variant="outline" className="mt-3 w-full" onClick={() => beginBoundaryEdit()}>
                <Pencil className="h-3.5 w-3.5" />
                {hasSavedBoundary ? 'Edit farm boundary' : 'Set farm boundary'}
              </Button>
            </>
          )}
        </Card>

        {!boundaryEditing ? (
          <>
        <Card>
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-medium text-muted-foreground">{editing ? 'Editing' : 'Step 1'}</p>
            {ready ? (
              <span className="flex items-center gap-1 text-xs font-medium text-[#166534]">
                <Check className="h-3.5 w-3.5" /> Ready
              </span>
            ) : clash.length ? (
              <span className="flex items-center gap-1 text-xs font-medium text-destructive">
                <TriangleAlert className="h-3.5 w-3.5" /> Overlap
              </span>
            ) : null}
          </div>
          <p className="text-base font-semibold">{editing ? editing.name : 'Draw the plot'}</p>

          <div className="mt-3 rounded-lg bg-[#f6f9fc] p-3">
            <p className="num text-2xl font-semibold">{acres.toFixed(2)} acres</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {ring.length} corner{ring.length === 1 ? '' : 's'} placed
            </p>
          </div>

          <p
            className={`mt-3 text-sm ${
              step.tone === 'warn' ? 'text-destructive' : step.tone === 'ok' ? 'text-[#166534]' : 'text-muted-foreground'
            }`}
          >
            {step.text}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {editing ? (
              <Button type="button" size="sm" variant="outline" onClick={cancelEdit}>
                Cancel edit
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!ring.length}
                  onClick={() => setRing((r) => r.slice(0, -1))}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Undo
                </Button>
                <Button type="button" size="sm" variant="ghost" disabled={!ring.length} onClick={() => setRing([])}>
                  <Trash2 className="h-3.5 w-3.5" /> Clear
                </Button>
              </>
            )}
          </div>

          {place ? (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-primary">
              <MapPin className="h-3.5 w-3.5" /> {place.split(',')[0]}
            </p>
          ) : null}

          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-muted-foreground">How to draw</summary>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              <li>Click inside the dashed box to add plot corners.</li>
              <li>Drag a white dot to move a corner. Drag the shape to move the whole plot.</li>
              <li>Click a green plot on the map to edit its shape.</li>
              <li>A new plot cannot sit on top of a saved plot.</li>
            </ul>
          </details>
        </Card>

        {editing ? (
          <Card>
            <form
              className="space-y-4 text-sm"
              onSubmit={(e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                setError('')
                start(async () => {
                  try {
                    const res = await run(
                      () =>
                        updatePlotShapeAction({
                          farmId,
                          plotId: editing.id,
                          name: String(fd.get('name')),
                          code: String(fd.get('code')),
                          ring,
                          irrigation: String(fd.get('irrigation') || ''),
                          soilType: String(fd.get('soilType') || ''),
                          status: String(fd.get('status') || ''),
                        }),
                      { ok: 'Plot updated' },
                    )
                    if (!res.ok) return
                    setEditing(null)
                    setRing([])
                    router.refresh()
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Could not save changes.')
                  }
                })
              }}
            >
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-muted-foreground" />
                <p className="text-base font-semibold">Edit this plot</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name">
                  <Input name="name" required defaultValue={editing.name} key={`n-${editing.id}`} />
                </Field>
                <Field label="Code">
                  <Input name="code" required defaultValue={editing.code} key={`c-${editing.id}`} />
                </Field>
              </div>
              <Field label="Status">
                <Select name="status" defaultValue={editing.status || 'fallow'} key={`s-${editing.id}`}>
                  <option value="planned">Planned</option>
                  <option value="growing">Growing</option>
                  <option value="fallow">Fallow</option>
                  <option value="harvested">Harvested</option>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Irrigation">
                  <Input name="irrigation" defaultValue={editing.irrigation ?? ''} key={`i-${editing.id}`} />
                </Field>
                <Field label="Soil">
                  <Input name="soilType" defaultValue={editing.soilType ?? ''} key={`t-${editing.id}`} />
                </Field>
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button disabled={pending || !ready} className="w-full">
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : clash.length ? (
                  'Move off the other plot'
                ) : (
                  'Save changes'
                )}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={cancelEdit}>
                Discard changes
              </Button>
              {askDelete ? (
                <div className="space-y-2 rounded-lg border border-destructive/30 bg-[#fff1f2] p-3">
                  <p className="text-sm text-destructive">Remove this plot and its crop history?</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      className="flex-1"
                      disabled={pending}
                      onClick={() => {
                        setError('')
                        start(async () => {
                          try {
                            const res = await run(
                              () => deletePlotAction({ farmId, plotId: editing.id }),
                              { ok: `${editing.name} deleted` },
                            )
                            if (!res.ok) return
                            cancelEdit()
                            router.refresh()
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Could not delete this plot.')
                          }
                        })
                      }}
                    >
                      {pending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Deleting…
                        </>
                      ) : (
                        'Yes, delete'
                      )}
                    </Button>
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setAskDelete(false)}>
                      Keep
                    </Button>
                  </div>
                </div>
              ) : (
                <Button type="button" variant="ghost" className="w-full text-destructive" onClick={() => setAskDelete(true)}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete plot
                </Button>
              )}
            </form>
          </Card>
        ) : (
          <Card>
            <form
              className="space-y-4 text-sm"
              onSubmit={(e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                setError('')
                start(async () => {
                  try {
                    const res = await run(
                      () =>
                        createPlotAction({
                          farmId,
                          name: String(fd.get('name')),
                          code: String(fd.get('code')),
                          ring,
                          irrigation: String(fd.get('irrigation') || ''),
                          soilType: String(fd.get('soilType') || ''),
                          cropId: String(fd.get('cropId') || '') || undefined,
                          leaveUnplanted: !String(fd.get('cropId') || ''),
                          startDate: String(fd.get('startDate') || ''),
                          endDate: String(fd.get('endDate') || ''),
                        }),
                      { ok: 'Plot saved' },
                    )
                    if (!res.ok) return
                    router.push(`/app/farms/${farmId}/plots/${res.data}`)
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Could not save plot.')
                  }
                })
              }}
            >
              <div>
                <p className="text-xs font-medium text-muted-foreground">Step 2</p>
                <p className="text-base font-semibold">Name it and save</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Name">
                  <Input name="name" required placeholder={`Plot ${nextCode}`} defaultValue={`Plot ${nextCode}`} />
                </Field>
                <Field label="Code">
                  <Input name="code" required placeholder={nextCode} defaultValue={nextCode} />
                </Field>
              </div>

              <button
                type="button"
                onClick={() => setShowDetails((v) => !v)}
                className="text-sm font-medium text-primary"
              >
                {showDetails ? 'Hide extra details' : 'Add crop, soil, water (optional)'}
              </button>

              {showDetails ? (
                <div className="space-y-3 border-t border-border pt-3">
                  <Field label="Current crop">
                    <CropPicker farmId={farmId} name="cropId" crops={crops} allowEmpty emptyLabel="Leave unplanted" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Cycle start">
                      <Input name="startDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
                    </Field>
                    <Field label="Cycle end">
                      <Input name="endDate" type="date" />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Irrigation">
                      <Input name="irrigation" placeholder="Drip" />
                    </Field>
                    <Field label="Soil">
                      <Input name="soilType" placeholder="Red loam" />
                    </Field>
                  </div>
                </div>
              ) : null}

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <Button disabled={pending || !ready} className="w-full">
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : clash.length ? (
                  'Overlaps a saved plot'
                ) : ring.length < 3 ? (
                  'Draw 3 corners first'
                ) : (
                  'Save plot'
                )}
              </Button>
            </form>
          </Card>
        )}
          </>
        ) : null}
      </div>
    </div>
  )
}
