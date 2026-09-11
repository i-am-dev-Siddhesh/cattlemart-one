import { useEffect, useMemo, useRef, useState } from 'react'
import { ImageOverlay, MapContainer, Polygon, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import '@geoman-io/leaflet-geoman-free'
import { centroid, latLngsToPolygon } from '../geo'
import type { Farm, Plot, Polygon as Poly } from '../types'
import { formatArea } from '../units'
import { useFarmStore } from '../store'
import { Button } from './ui'

type Mode = 'idle' | 'farm' | 'plot' | 'edit'

function latlngsOf(layer: L.Layer): L.LatLng[] {
  const poly = layer as L.Polygon
  const raw = poly.getLatLngs()
  const first = Array.isArray(raw[0]) ? (raw[0] as L.LatLng[]) : (raw as L.LatLng[])
  return first
}

function usePmEdit(editable: boolean, onEdit: (p: Poly) => void) {
  const ref = useRef<L.Polygon | null>(null)
  const onEditRef = useRef(onEdit)
  onEditRef.current = onEdit
  useEffect(() => {
    const layer = ref.current
    if (!layer?.pm) return
    if (!editable) return
    layer.pm.enable()
    const handler = () => onEditRef.current(latLngsToPolygon(latlngsOf(layer)))
    layer.on('pm:update', handler)
    return () => {
      layer.off('pm:update', handler)
      layer.pm.disable()
    }
  }, [editable])
  return ref
}

function FarmBoundary({
  positions,
  editable,
  onEdit,
}: {
  positions: [number, number][]
  editable: boolean
  onEdit: (p: Poly) => void
}) {
  const ref = usePmEdit(editable, onEdit)
  return (
    <Polygon
      ref={ref}
      positions={positions}
      pathOptions={{ color: '#2a1c12', weight: 3, fillOpacity: 0.04, dashArray: '6 6' }}
    />
  )
}

function Geoman({
  mode,
  onFarmBoundary,
  onPlotDrawn,
}: {
  mode: Mode
  farm?: Farm
  onFarmBoundary: (p: Poly) => void
  onPlotDrawn: (p: Poly) => void
}) {
  const map = useMap()
  const modeRef = useRef(mode)
  modeRef.current = mode

  const onFarmRef = useRef(onFarmBoundary)
  const onPlotRef = useRef(onPlotDrawn)
  onFarmRef.current = onFarmBoundary
  onPlotRef.current = onPlotDrawn

  useEffect(() => {
    const onCreate = (e: { layer: L.Layer }) => {
      const polygon = latLngsToPolygon(latlngsOf(e.layer))
      e.layer.remove()
      if (modeRef.current === 'farm') onFarmRef.current(polygon)
      if (modeRef.current === 'plot') onPlotRef.current(polygon)
    }
    map.on('pm:create', onCreate)
    return () => {
      map.off('pm:create', onCreate)
    }
  }, [map])

  useEffect(() => {
    if (!map.pm) return
    if (mode !== 'farm' && mode !== 'plot') return
    map.pm.enableDraw('Polygon')
    return () => {
      map.pm.disableDraw('Polygon')
    }
  }, [mode, map])

  return null
}

function PlotShape({
  plot,
  selected,
  editable,
  onSelect,
  onEdit,
}: {
  plot: Plot
  selected: boolean
  editable: boolean
  onSelect: () => void
  onEdit: (p: Poly) => void
}) {
  const ref = usePmEdit(editable, onEdit)
  const positions = useMemo(
    () => (plot.boundary ? plot.boundary[0].map(([lng, lat]) => [lat, lng] as [number, number]) : []),
    [plot.boundary],
  )
  if (positions.length < 3) return null
  return (
    <Polygon
      ref={ref}
      positions={positions}
      pathOptions={{
        color: plot.color,
        fillColor: plot.color,
        fillOpacity: selected ? 0.55 : 0.38,
        weight: selected ? 3 : 2,
      }}
      eventHandlers={{
        click: () => onSelect(),
      }}
    >
      <Tooltip permanent direction="center" className="plot-label" opacity={1}>
        {plot.name}
        <br />
        {formatArea(plot.area, plot.areaUnit)}
      </Tooltip>
    </Polygon>
  )
}

export function FarmMap({
  farm,
  plots,
  selectedPlotId,
  onSelectPlot,
  compact,
}: {
  farm: Farm
  plots: Plot[]
  selectedPlotId?: string | null
  onSelectPlot?: (id: string) => void
  compact?: boolean
}) {
  const [mode, setMode] = useState<Mode>('idle')
  const fileRef = useRef<HTMLInputElement>(null)
  const farmPositions = farm.boundary
    ? farm.boundary[0].map(([lng, lat]) => [lat, lng] as [number, number])
    : []

  const uploadLayout = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const bounds = farm.layoutBounds || [
        [farm.center.lat - 0.0012, farm.center.lng - 0.0015],
        [farm.center.lat + 0.0012, farm.center.lng + 0.0015],
      ]
      useFarmStore.getState().updateFarm(farm.id, { layoutImage: String(reader.result), layoutBounds: bounds })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className={`map-wrap ${compact ? 'compact' : ''}`}>
      <div className="map-tools">
          <Button small kind={mode === 'farm' ? 'primary' : 'secondary'} onClick={() => setMode(mode === 'farm' ? 'idle' : 'farm')}>
            Draw farm
          </Button>
          <Button small kind={mode === 'plot' ? 'primary' : 'secondary'} onClick={() => setMode(mode === 'plot' ? 'idle' : 'plot')}>
            Draw plot
          </Button>
          <Button small kind={mode === 'edit' ? 'primary' : 'secondary'} onClick={() => setMode(mode === 'edit' ? 'idle' : 'edit')}>
            Edit shapes
          </Button>
          <Button small kind="secondary" onClick={() => fileRef.current?.click()}>
            Upload layout
          </Button>
          {farm.layoutImage && (
            <Button
              small
              kind="ghost"
              onClick={() => useFarmStore.getState().updateFarm(farm.id, { layoutImage: null, layoutBounds: null })}
            >
              Clear image
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) uploadLayout(f)
              e.target.value = ''
            }}
          />
        </div>
      <MapContainer
        key={farm.id}
        center={[farm.center.lat, farm.center.lng]}
        zoom={17}
        scrollWheelZoom
      >
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {farm.layoutImage && farm.layoutBounds && (
          <ImageOverlay url={farm.layoutImage} bounds={farm.layoutBounds} opacity={0.72} />
        )}
        {farmPositions.length >= 3 && (
          <FarmBoundary
            positions={farmPositions}
            editable={mode === 'edit'}
            onEdit={(boundary) => useFarmStore.getState().updateFarm(farm.id, { boundary })}
          />
        )}
        {plots.map((plot) => (
          <PlotShape
            key={plot.id}
            plot={plot}
            selected={plot.id === selectedPlotId}
            editable={mode === 'edit'}
            onSelect={() => onSelectPlot?.(plot.id)}
            onEdit={(p) => useFarmStore.getState().updatePlot(plot.id, { boundary: p })}
          />
        ))}
        {/* drawing tools attach in Geoman when Draw farm / Draw plot is on */}
        {mode !== 'idle' && (
          <Geoman
            mode={mode}
            onFarmBoundary={(boundary) => {
              const c = centroid(boundary)
              useFarmStore.getState().updateFarm(farm.id, { boundary, center: c || farm.center })
              setMode('idle')
            }}
            onPlotDrawn={(boundary) => {
              const name = window.prompt('Plot name', `Plot ${plots.length + 1}`)
              if (!name) {
                setMode('idle')
                return
              }
              useFarmStore.getState().addPlot({
                farmId: farm.id,
                name,
                boundary,
                color: '',
                status: 'active',
                notes: '',
                areaUnit: farm.areaUnit,
              })
              setMode('idle')
            }}
          />
        )}
      </MapContainer>
    </div>
  )
}
