import { useMemo, useState } from 'react'
import { useFarmStore, useActiveFarm } from '../store'
import { formatDate } from '../units'

function monthCells(year: number, month: number) {
  const first = new Date(year, month, 1)
  const start = (first.getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const cells: { date: string; mute: boolean }[] = []
  for (let i = 0; i < start; i++) {
    const d = new Date(year, month, -start + i + 1)
    cells.push({ date: d.toISOString().slice(0, 10), mute: true })
  }
  for (let d = 1; d <= days; d++) {
    const dt = new Date(year, month, d)
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ date: iso, mute: false })
    void dt
  }
  while (cells.length % 7) {
    const last = cells[cells.length - 1]
    const n = new Date(last.date)
    n.setDate(n.getDate() + 1)
    cells.push({ date: n.toISOString().slice(0, 10), mute: true })
  }
  return cells
}

export function CalendarPage() {
  const farm = useActiveFarm()
  const plotsAll = useFarmStore((s) => s.plots)
  const plots = plotsAll.filter((p) => p.farmId === farm?.id)
  const activities = useFarmStore((s) => s.activities)
  const types = useFarmStore((s) => s.activityTypes)
  const cycles = useFarmStore((s) => s.cropCycles)
  const [cursor, setCursor] = useState(() => new Date(2026, 8, 1))
  const [plotId, setPlotId] = useState('')
  const [crop, setCrop] = useState('')
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const cells = useMemo(() => monthCells(year, month), [year, month])
  const events = activities.filter((a) => {
    if (!plots.some((p) => p.id === a.plotId)) return false
    if (plotId && a.plotId !== plotId) return false
    if (crop) {
      const c = cycles.find((x) => x.id === a.cropCycleId)
      if (c?.cropName !== crop) return false
    }
    return true
  })
  const harvests = cycles.filter((c) => plots.some((p) => p.id === c.plotId) && c.expectedHarvestDate)
  const crops = [...new Set(cycles.filter((c) => plots.some((p) => p.id === c.plotId)).map((c) => c.cropName))]

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Activity calendar</h2>
          <p className="lede">Planting, spraying, irrigation, harvest — filter by plot or crop.</p>
        </div>
        <div className="row">
          <button className="btn secondary" onClick={() => setCursor(new Date(year, month - 1, 1))}>
            Prev
          </button>
          <strong>
            {cursor.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
          </strong>
          <button className="btn secondary" onClick={() => setCursor(new Date(year, month + 1, 1))}>
            Next
          </button>
        </div>
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
        <select value={crop} onChange={(e) => setCrop(e.target.value)}>
          <option value="">All crops</option>
          {crops.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="calendar" style={{ marginBottom: 8 }}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="lede" style={{ padding: 8 }}>
            {d}
          </div>
        ))}
      </div>
      <div className="calendar">
        {cells.map((c, i) => {
          const dayActs = events.filter((a) => a.date === c.date)
          const dayHarvest = harvests.filter((h) => h.expectedHarvestDate === c.date)
          return (
            <div key={`${c.date}-${i}`} className={`cal-cell ${c.mute ? 'mute' : ''}`}>
              <strong>{Number(c.date.slice(8))}</strong>
              {dayActs.map((a) => (
                <div key={a.id} className="cal-event">
                  {types.find((t) => t.id === a.activityTypeId)?.name} · {plots.find((p) => p.id === a.plotId)?.name}
                </div>
              ))}
              {dayHarvest.map((h) => (
                <div key={h.id} className="cal-event">
                  Harvest {h.cropName} · {plots.find((p) => p.id === h.plotId)?.name}
                </div>
              ))}
            </div>
          )
        })}
      </div>
      <p className="lede" style={{ marginTop: 12 }}>
        Today’s book date is {formatDate(new Date().toISOString().slice(0, 10))}.
      </p>
    </div>
  )
}
