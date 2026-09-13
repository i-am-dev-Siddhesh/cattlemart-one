import { useMemo, useState } from 'react'
import { ActivityForm, CropForm } from '../components/forms'
import { Button, Modal } from '../components/ui'
import { useActiveFarm, useFarmStore } from '../store'
import { formatDate, formatMoney } from '../units'

export function ActivitiesPage() {
  const farm = useActiveFarm()
  const plotsAll = useFarmStore((s) => s.plots)
  const plots = plotsAll.filter((p) => p.farmId === farm?.id)
  const activities = useFarmStore((s) => s.activities)
  const types = useFarmStore((s) => s.activityTypes)
  const cycles = useFarmStore((s) => s.cropCycles)
  const [plotId, setPlotId] = useState('')
  const [open, setOpen] = useState(false)
  const rows = useMemo(
    () =>
      activities
        .filter((a) => plots.some((p) => p.id === a.plotId) && (!plotId || a.plotId === plotId))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [activities, plots, plotId],
  )
  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Activities</h2>
          <p className="lede">Work done on each plot. Costs land in that plot’s accounts automatically.</p>
        </div>
        <Button onClick={() => setOpen(true)}>Add activity</Button>
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <select value={plotId} onChange={(e) => setPlotId(e.target.value)}>
          <option value="">All plots</option>
          {plots.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="card">
        <table className="data">
          <thead>
            <tr>
              <th>Date</th>
              <th>Plot</th>
              <th>Activity</th>
              <th>Crop</th>
              <th>Qty</th>
              <th>Cost</th>
              <th>Who</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td>{formatDate(a.date)}</td>
                <td>{plots.find((p) => p.id === a.plotId)?.name}</td>
                <td>{types.find((t) => t.id === a.activityTypeId)?.name}</td>
                <td>{cycles.find((c) => c.id === a.cropCycleId)?.cropName || '—'}</td>
                <td>{a.quantity ? `${a.quantity} ${a.unit}` : '—'}</td>
                <td>{formatMoney(a.totalCost)}</td>
                <td>{a.person}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal title="Add activity" open={open} onClose={() => setOpen(false)}>
        <ActivityForm plots={plots} plotId={plotId || plots[0]?.id} onDone={() => setOpen(false)} />
      </Modal>
    </div>
  )
}

export function CropsPage() {
  const farm = useActiveFarm()
  const plotsAll = useFarmStore((s) => s.plots)
  const plots = plotsAll.filter((p) => p.farmId === farm?.id)
  const cycles = useFarmStore((s) => s.cropCycles)
  const [open, setOpen] = useState(false)
  const [plotId, setPlotId] = useState('')
  const rows = cycles
    .filter((c) => plots.some((p) => p.id === c.plotId) && (!plotId || c.plotId === plotId))
    .sort((a, b) => b.plantingDate.localeCompare(a.plantingDate))
  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Crops</h2>
          <p className="lede">Seasons stack. A new crop never overwrites last year’s book.</p>
        </div>
        <Button onClick={() => setOpen(true)}>New crop cycle</Button>
      </div>
      <select value={plotId} onChange={(e) => setPlotId(e.target.value)}>
        <option value="">All plots</option>
        {plots.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <div className="card" style={{ marginTop: 12 }}>
        <table className="data">
          <thead>
            <tr>
              <th>Plot</th>
              <th>Season</th>
              <th>Crop</th>
              <th>Variety</th>
              <th>Planted</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{plots.find((p) => p.id === c.plotId)?.name}</td>
                <td>{c.season}</td>
                <td>{c.cropName}</td>
                <td>{c.variety}</td>
                <td>{c.plantingDate}</td>
                <td>{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal title="New crop cycle" open={open} onClose={() => setOpen(false)}>
        <CropForm plots={plots} plotId={plotId || plots[0]?.id} onDone={() => setOpen(false)} />
      </Modal>
    </div>
  )
}
