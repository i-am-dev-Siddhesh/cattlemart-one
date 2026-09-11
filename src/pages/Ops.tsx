import { useState } from 'react'
import { Button, Field } from '../components/ui'
import { CROP_NOTES } from '../farmos'
import { useActiveFarm, useFarmStore } from '../store'
import { formatDate, formatMoney, todayIso } from '../units'

const TABS = ['passport', 'inventory', 'health', 'soil', 'water', 'people', 'harvest', 'tasks', 'diary', 'crops'] as const

export function OpsPage() {
  const farm = useActiveFarm()
  const state = useFarmStore()
  const [tab, setTab] = useState<(typeof TABS)[number]>('passport')
  const plots = state.plots.filter((p) => p.farmId === farm?.id)
  if (!farm) return <p>Add a farm first.</p>

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Operations</h2>
          <p className="lede">
            Inventory, health, soil, water, labour, harvest, tasks, diary — all hung on a plot and cycle when you name
            one.
          </p>
        </div>
      </div>
      <div className="row" style={{ marginBottom: 16 }}>
        {TABS.map((k) => (
          <Button key={k} small kind={tab === k ? 'primary' : 'secondary'} onClick={() => setTab(k)}>
            {k}
          </Button>
        ))}
      </div>
      {tab === 'passport' && (
        <div className="card">
          <h3>Field passports</h3>
          {plots.map((p) => {
            const pests = state.pests.filter((x) => x.plotId === p.id).length
            const dis = state.diseases.filter((x) => x.plotId === p.id).length
            const soil = state.soilTests.filter((x) => x.plotId === p.id)
            return (
              <div key={p.id} className="plot-chip">
                <span className="swatch" style={{ background: p.color }} />
                <div>
                  <strong>
                    {p.plotNumber} {p.name}
                  </strong>
                  <div className="lede">
                    {p.ownership || 'ownership unknown'} · soil {p.soilType || 'not recorded'} · irrig{' '}
                    {p.irrigationType || 'not recorded'} · pest notes {pests} · disease notes {dis} · soil tests{' '}
                    {soil.length}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {tab === 'inventory' && <InventoryBlock farmId={farm.id} />}
      {tab === 'health' && <HealthBlock plots={plots} />}
      {tab === 'soil' && (
        <div className="card">
          <h3>Soil tests</h3>
          <p className="lede">Only lab rows you entered. Missing nutrients stay “not recorded”.</p>
          <table className="data">
            <thead>
              <tr>
                <th>Date</th>
                <th>Plot</th>
                <th>pH</th>
                <th>N</th>
                <th>P</th>
                <th>K</th>
                <th>OC</th>
                <th>Lab</th>
              </tr>
            </thead>
            <tbody>
              {state.soilTests
                .filter((t) => plots.some((p) => p.id === t.plotId))
                .map((t) => (
                  <tr key={t.id}>
                    <td>{t.date}</td>
                    <td>{plots.find((p) => p.id === t.plotId)?.name}</td>
                    <td>{t.ph ?? 'not recorded'}</td>
                    <td>{t.nitrogen || '—'}</td>
                    <td>{t.phosphorus || '—'}</td>
                    <td>{t.potassium || '—'}</td>
                    <td>{t.organicCarbon || '—'}</td>
                    <td>{t.lab}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === 'water' && (
        <div className="card">
          <h3>Irrigation log</h3>
          {state.irrigations
            .filter((i) => plots.some((p) => p.id === i.plotId))
            .map((i) => (
              <div key={i.id} className="row">
                <span>
                  {i.date} · {plots.find((p) => p.id === i.plotId)?.name} · {i.method} · {i.hours ?? '—'} h · qty{' '}
                  {i.quantity ?? 'not recorded'} · {formatMoney(i.cost)}
                </span>
              </div>
            ))}
        </div>
      )}
      {tab === 'people' && (
        <div className="grid-2">
          <div className="card">
            <h3>Workers</h3>
            {state.workers.filter((w) => w.farmId === farm.id).map((w) => (
              <p key={w.id}>
                {w.name} · {w.role} · wage {w.dailyWage != null ? formatMoney(w.dailyWage) : 'not recorded'}
              </p>
            ))}
            <h3>Labour days</h3>
            {state.labourLogs.map((l) => (
              <p key={l.id}>
                {l.date} · {plots.find((p) => p.id === l.plotId)?.name} · {l.hours} h · {formatMoney(l.cost)} · {l.activity}
              </p>
            ))}
          </div>
          <div className="card">
            <h3>Machinery</h3>
            {state.equipment
              .filter((e) => e.farmId === farm.id)
              .map((e) => (
                <p key={e.id}>
                  {e.name} · {e.type} · {e.fuelType} · {e.notes}
                </p>
              ))}
          </div>
        </div>
      )}
      {tab === 'harvest' && (
        <div className="card">
          <h3>Harvest batches (trace)</h3>
          {state.harvests.map((h) => (
            <p key={h.id}>
              {h.batch} · {h.date} · {plots.find((p) => p.id === h.plotId)?.name} · {h.quantity} {h.unit} · cycle{' '}
              {h.cropCycleId || 'none'} · {h.notes}
            </p>
          ))}
        </div>
      )}
      {tab === 'tasks' && <TasksBlock farmId={farm.id} plots={plots} />}
      {tab === 'diary' && (
        <div className="card">
          <h3>Farm diary</h3>
          {state.diary
            .filter((d) => d.farmId === farm.id)
            .map((d) => (
              <div key={d.id} className="plot-chip">
                <div>
                  <strong>{formatDate(d.date)}</strong>
                  <div>{d.text}</div>
                  <div className="lede">{d.structured}</div>
                </div>
              </div>
            ))}
        </div>
      )}
      {tab === 'crops' && (
        <div className="card">
          <h3>Crop notes (not prescriptions)</h3>
          {CROP_NOTES.map((c) => (
            <div key={c.name} className="plot-chip">
              <div>
                <strong>
                  {c.name} · {c.local}
                </strong>
                <div className="lede">
                  {c.scientific} · {c.seasons}
                </div>
                <div>{c.note}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InventoryBlock({ farmId }: { farmId: string }) {
  const items = useFarmStore((s) => s.inventory.filter((i) => i.farmId === farmId))
  const moves = useFarmStore((s) => s.inventoryMoves)
  const useInv = useFarmStore((s) => s.useInventory)
  const add = useFarmStore((s) => s.addInventory)
  const [used, setUsed] = useState('10')
  const [itemId, setItemId] = useState(items[0]?.id || '')
  return (
    <div className="card">
      <h3>Input inventory</h3>
      <table className="data">
        <thead>
          <tr>
            <th>Item</th>
            <th>On hand</th>
            <th>Min</th>
            <th>Store</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td>
                {i.name} {i.brand}
              </td>
              <td>
                {i.quantity} {i.unit}
              </td>
              <td>{i.minStock}</td>
              <td>{i.storage}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row">
        <select value={itemId} onChange={(e) => setItemId(e.target.value)}>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        <input value={used} onChange={(e) => setUsed(e.target.value)} />
        <Button
          onClick={() => {
            const n = Number(used)
            const id = useInv(itemId, n, null, 'Manual use')
            if (!id) window.alert('Not enough stock or bad quantity. Stock was not changed.')
          }}
        >
          Deduct (shows previous → used → remaining)
        </Button>
      </div>
      <h3>Moves</h3>
      {moves.map((m) => (
        <p key={m.id}>
          {m.date} · {m.previous} → used {m.used} → {m.remaining} · {m.notes}
        </p>
      ))}
      <Button
        kind="ghost"
        onClick={() => {
          const name = window.prompt('Item name')
          if (!name) return
          add({
            farmId,
            name,
            category: 'other',
            brand: '',
            unit: 'kg',
            quantity: 0,
            minStock: 0,
            purchasePrice: null,
            expiryDate: '',
            storage: '',
            supplier: '',
            notes: '',
          })
        }}
      >
        Add empty item
      </Button>
    </div>
  )
}

function HealthBlock({ plots }: { plots: { id: string; name: string }[] }) {
  const pests = useFarmStore((s) => s.pests)
  const diseases = useFarmStore((s) => s.diseases)
  const obs = useFarmStore((s) => s.observations)
  return (
    <div className="grid-2">
      <div className="card">
        <h3>Pests (confidence on each row)</h3>
        {pests.map((p) => (
          <p key={p.id}>
            {p.date} · {plots.find((x) => x.id === p.plotId)?.name} · {p.name} · {p.confidence} · {p.symptoms}
          </p>
        ))}
      </div>
      <div className="card">
        <h3>Disease notes</h3>
        {diseases.map((d) => (
          <p key={d.id}>
            {d.date} · {plots.find((x) => x.id === d.plotId)?.name} · {d.name} · {d.confidence}
          </p>
        ))}
        <h3>Growth notes</h3>
        {obs.map((o) => (
          <p key={o.id}>
            {o.date} · {o.growthStage} · {o.notes}
          </p>
        ))}
      </div>
    </div>
  )
}

function TasksBlock({ farmId, plots }: { farmId: string; plots: { id: string; name: string }[] }) {
  const tasks = useFarmStore((s) => s.tasks.filter((t) => t.farmId === farmId))
  const add = useFarmStore((s) => s.addTask)
  const update = useFarmStore((s) => s.updateTask)
  const [title, setTitle] = useState('')
  return (
    <div className="card">
      <h3>Tasks</h3>
      {tasks.map((t) => (
        <div key={t.id} className="row">
          <span>
            {t.dueDate} · {t.title} · {t.status} · {plots.find((p) => p.id === t.plotId)?.name || 'farm'}
          </span>
          <Button small kind="ghost" onClick={() => update(t.id, { status: 'completed' })}>
            Done
          </Button>
        </div>
      ))}
      <Field label="New task">
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Button
        onClick={() => {
          if (!title.trim()) return
          add({
            farmId,
            plotId: null,
            title: title.trim(),
            dueDate: todayIso(),
            priority: 'medium',
            status: 'planned',
            assignee: '',
            notes: '',
          })
          setTitle('')
        }}
      >
        Add task
      </Button>
    </div>
  )
}
