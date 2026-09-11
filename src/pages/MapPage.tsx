import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FarmMap } from '../components/FarmMap'
import { FarmForm, PlotMetaForm } from '../components/forms'
import { Button, Modal } from '../components/ui'
import { currentCycle } from '../finance'
import { useFarmStore } from '../store'
import { formatArea } from '../units'

export function MapPage() {
  const state = useFarmStore()
  const farm = state.farms.find((f) => f.id === state.activeFarmId) ?? state.farms[0]
  const plots = state.plots.filter((p) => p.farmId === farm?.id)
  const [selected, setSelected] = useState<string | null>(null)
  const [farmOpen, setFarmOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const navigate = useNavigate()
  const selectedId = selected ?? plots[0]?.id ?? null
  const plot = plots.find((p) => p.id === selectedId)
  const crop = plot ? currentCycle(state.cropCycles, plot.id) : undefined

  if (!farm) {
    return (
      <div>
        <div className="topbar">
          <div>
            <h2>Farm map</h2>
            <p className="lede">Add a farm first, then draw the boundary and split it into plots.</p>
          </div>
        </div>
        <div className="card">
          <FarmForm onDone={() => undefined} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>{farm.name} map</h2>
          <p className="lede">
            Draw the farm outline, then draw polygons for each plot. Names sit on the map. Area is measured from the
            shape.
          </p>
        </div>
        <Button kind="secondary" onClick={() => setFarmOpen(true)}>
          Farm details
        </Button>
      </div>
      <div className="grid-2">
        <FarmMap farm={farm} plots={plots} selectedPlotId={selectedId} compact />
        <div className="card">
          <h3>Plots</h3>
          {plots.map((p) => (
            <button
              key={p.id}
              className={`plot-chip ${p.id === selectedId ? 'selected' : ''}`}
              onClick={() => setSelected(p.id)}
              style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: '1px solid var(--line)' }}
            >
              <span className="swatch" style={{ background: p.color }} />
              <div>
                <strong>
                  {p.name} · {p.plotNumber}
                </strong>
                <div className="lede">
                  {formatArea(p.area, p.areaUnit)} · {currentCycle(state.cropCycles, p.id)?.cropName || 'No crop'}
                </div>
              </div>
            </button>
          ))}
          {plot && (
            <div style={{ marginTop: 16 }}>
              <h3>{plot.name}</h3>
              <p className="lede">
                {plot.plotNumber} · {formatArea(plot.area, plot.areaUnit)}
                {crop ? ` · ${crop.cropName} (${crop.season})` : ''}
              </p>
              <p>{plot.notes}</p>
              <div className="row">
                <Button onClick={() => navigate(`/plots/${plot.id}`)}>Open dashboard</Button>
                <Button kind="secondary" onClick={() => setEditOpen(true)}>
                  Rename / colour
                </Button>
                <Button
                  kind="danger"
                  onClick={() => {
                    if (window.confirm(`Delete ${plot.name}? This removes its activities and money too.`)) {
                      state.deletePlot(plot.id)
                      setSelected(null)
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      <Modal title="Farm details" open={farmOpen} onClose={() => setFarmOpen(false)}>
        <FarmForm initial={farm} onDone={() => setFarmOpen(false)} />
      </Modal>
      {plot && (
        <Modal title="Edit plot" open={editOpen} onClose={() => setEditOpen(false)}>
          <PlotMetaForm plot={plot} onDone={() => setEditOpen(false)} />
        </Modal>
      )}
    </div>
  )
}
