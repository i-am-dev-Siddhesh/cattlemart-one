import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ActivityForm, CropForm, ExpenseForm, IncomeForm, PlotMetaForm } from '../components/forms'
import { Button, Modal, Money, Stat } from '../components/ui'
import { currentCycle, expenseBreakdown, plotExpenses, plotIncomes, summarizePlot } from '../finance'
import { t } from '../i18n'
import { useFarmStore } from '../store'
import { formatArea, formatDate, formatMoney } from '../units'
import { FarmMap } from '../components/FarmMap'

export function PlotsPage() {
  const farmId = useFarmStore((s) => s.activeFarmId)
  const plotsAll = useFarmStore((s) => s.plots)
  const plots = plotsAll.filter((p) => p.farmId === farmId)
  const cycles = useFarmStore((s) => s.cropCycles)
  const navigate = useNavigate()
  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Plots</h2>
          <p className="lede">Each plot is its own field book. Open one to see work, crop history, and profit.</p>
        </div>
        <Button onClick={() => navigate('/map')}>Draw on map</Button>
      </div>
      <div className="grid-3">
        {plots.map((p) => {
          const c = currentCycle(cycles, p.id)
          return (
            <button
              key={p.id}
              className="card"
              style={{ textAlign: 'left', cursor: 'pointer' }}
              onClick={() => navigate(`/plots/${p.id}`)}
            >
              <h3>
                <span className="swatch" style={{ background: p.color }} />
                {p.name}
              </h3>
              <p className="lede">
                {p.plotNumber} · {formatArea(p.area, p.areaUnit)} · {t(`plotStatus.${p.status}`)}
              </p>
              <p>
                {c ? (
                  <>
                    <strong>{c.cropName}</strong> · {c.season}
                  </>
                ) : (
                  'No crop cycle yet'
                )}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function PlotDetailPage() {
  const { plotId } = useParams()
  const state = useFarmStore()
  const plot = state.plots.find((p) => p.id === plotId)
  const farm = state.farms.find((f) => f.id === plot?.farmId)
  const [tab, setTab] = useState<'overview' | 'activity' | 'crop' | 'money' | 'passport'>('overview')
  const [open, setOpen] = useState<string | null>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [cycleId, setCycleId] = useState('')
  const plots = state.plots.filter((p) => p.farmId === plot?.farmId)

  const range = useMemo(() => ({ from: from || undefined, to: to || undefined }), [from, to])
  if (!plot || !farm) return <p>Plot not found.</p>

  const cycles = state.cropCycles.filter((c) => c.plotId === plot.id).sort((a, b) => b.plantingDate.localeCompare(a.plantingDate))
  const crop = currentCycle(state.cropCycles, plot.id)
  const finance = summarizePlot(state, plot, range, cycleId || undefined)
  const activities = state.activities
    .filter((a) => a.plotId === plot.id)
    .sort((a, b) => b.date.localeCompare(a.date))
  const expenses = plotExpenses(state, plot.id, range, cycleId || undefined)
  const incomes = plotIncomes(state, plot.id, range, cycleId || undefined)
  const typeName = (id: string) => state.activityTypes.find((x) => x.id === id)?.name || id
  const breakdown = expenseBreakdown(expenses)

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>{plot.name}</h2>
          <p className="lede">
            {plot.plotNumber} · {formatArea(plot.area, plot.areaUnit)} · {crop?.cropName || 'No standing crop'}
          </p>
        </div>
        <div className="row">
          <Button kind="secondary" onClick={() => setOpen('plot')}>
            Edit plot
          </Button>
          <Button onClick={() => setOpen('activity')}>Add activity</Button>
        </div>
      </div>
      <div className="stats">
        <Stat label="Area" value={formatArea(plot.area, plot.areaUnit)} />
        <Stat label="Status" value={t(`plotStatus.${plot.status}`)} />
        <Stat label="Expenses" value={formatMoney(finance.expense)} />
        <Stat label="Income" value={formatMoney(finance.income)} />
        <Stat label="Profit" value={formatMoney(finance.profit)} tone={finance.profit >= 0 ? 'good' : 'bad'} />
      </div>
      <div className="row" style={{ marginBottom: 16 }}>
        {(['overview', 'activity', 'crop', 'money', 'passport'] as const).map((k) => (
          <Button key={k} kind={tab === k ? 'primary' : 'secondary'} small onClick={() => setTab(k)}>
            {k === 'overview'
              ? 'Overview'
              : k === 'activity'
                ? 'Timeline'
                : k === 'crop'
                  ? 'Crops'
                  : k === 'money'
                    ? 'Finance'
                    : 'Passport'}
          </Button>
        ))}
      </div>
      {tab === 'overview' && (
        <div className="grid-2">
          <div className="card">
            <h3>Standing crop</h3>
            {crop ? (
              <>
                <p>
                  <strong>{crop.cropName}</strong> {crop.variety} · {crop.season}
                </p>
                <p className="lede">
                  Planted {formatDate(crop.plantingDate)} · Harvest expected {formatDate(crop.expectedHarvestDate)}
                </p>
                <span className="pill">{t(`cropStatus.${crop.status}`)}</span>
              </>
            ) : (
              <p className="lede">Add a crop cycle to start this season without erasing the last one.</p>
            )}
            <p>{plot.notes}</p>
            <FarmMap farm={farm} plots={plots} selectedPlotId={plot.id} compact />
          </div>
          <div className="card">
            <h3>Latest work</h3>
            <div className="timeline">
              {activities.slice(0, 8).map((a) => (
                <div className="tl-item" key={a.id}>
                  <div className="tl-dot" />
                  <div>
                    <strong>{typeName(a.activityTypeId)}</strong>
                    <div className="lede">
                      {formatDate(a.date)} · {formatMoney(a.totalCost)} · {a.person}
                    </div>
                    <div>{a.notes}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {tab === 'activity' && (
        <div className="card">
          <h3>Activity timeline</h3>
          <div className="timeline">
            {activities.map((a) => (
              <div className="tl-item" key={a.id}>
                <div className="tl-dot" />
                <div>
                  <strong>{typeName(a.activityTypeId)}</strong>
                  <div className="lede">
                    {formatDate(a.date)}
                    {a.quantity ? ` · ${a.quantity} ${a.unit}` : ''} · Labour {formatMoney(a.labourCost)} · Machinery{' '}
                    {formatMoney(a.machineryCost)} · Material {formatMoney(a.materialCost)}
                  </div>
                  <div>{a.notes}</div>
                  <Button
                    small
                    kind="danger"
                    onClick={() => {
                      if (window.confirm('Delete this activity and its linked expenses?')) state.deleteActivity(a.id)
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === 'crop' && (
        <div className="card">
          <div className="row">
            <h3>Crop history</h3>
            <span className="spacer" />
            <Button small onClick={() => setOpen('crop')}>
              New cycle
            </Button>
          </div>
          <table className="data">
            <thead>
              <tr>
                <th>Season</th>
                <th>Crop</th>
                <th>Planted</th>
                <th>Harvest</th>
                <th>Yield</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {cycles.map((c) => (
                <tr key={c.id}>
                  <td>{c.season}</td>
                  <td>
                    {c.cropName} {c.variety}
                  </td>
                  <td>{formatDate(c.plantingDate)}</td>
                  <td>{formatDate(c.actualHarvestDate || c.expectedHarvestDate)}</td>
                  <td>
                    {c.actualYield ?? c.expectedYield ?? '—'} {c.yieldUnit}
                  </td>
                  <td>{t(`cropStatus.${c.status}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === 'money' && (
        <div>
          <div className="row" style={{ marginBottom: 12 }}>
            <label className="field">
              From
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="field">
              To
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
            <label className="field">
              Crop / season
              <select value={cycleId} onChange={(e) => setCycleId(e.target.value)}>
                <option value="">All cycles</option>
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.season} · {c.cropName}
                  </option>
                ))}
              </select>
            </label>
            <Button small onClick={() => setOpen('expense')}>
              Expense
            </Button>
            <Button small onClick={() => setOpen('income')}>
              Income
            </Button>
          </div>
          <div className="stats">
            <Stat label="Cost / acre" value={formatMoney(finance.costPerAcre)} />
            <Stat label="Revenue / acre" value={formatMoney(finance.revenuePerAcre)} />
            <Stat label="Profit / acre" value={formatMoney(finance.profitPerAcre)} />
            <Stat label="Labour" value={formatMoney(finance.labour)} />
            <Stat label="Machinery" value={formatMoney(finance.machinery)} />
          </div>
          <div className="grid-2">
            <div className="card">
              <h3>Expense breakdown</h3>
              <div style={{ height: 240 }}>
                <ResponsiveContainer>
                  <BarChart data={breakdown.map((b) => ({ name: t(`expense.${b.key}`), amount: b.amount }))}>
                    <XAxis dataKey="name" hide />
                    <YAxis />
                    <Tooltip formatter={(v) => formatMoney(Number(v))} />
                    <Bar dataKey="amount" fill="#1f4d32" radius={6} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {expenses.map((e) => (
                <div key={e.id} className="row">
                  <span>
                    {formatDate(e.date)} · {t(`expense.${e.category}`)} · {e.notes}
                  </span>
                  <span className="spacer" />
                  <Money n={e.amount} />
                  <Button small kind="danger" onClick={() => state.deleteExpense(e.id)}>
                    ×
                  </Button>
                </div>
              ))}
            </div>
            <div className="card">
              <h3>Income</h3>
              {incomes.map((e) => (
                <div key={e.id} className="row">
                  <span>
                    {formatDate(e.date)} · {t(`income.${e.category}`)} · {e.buyer}
                  </span>
                  <span className="spacer" />
                  <Money n={e.amount} />
                  <Button small kind="danger" onClick={() => state.deleteIncome(e.id)}>
                    ×
                  </Button>
                </div>
              ))}
              <p>
                Profit <Money n={finance.profit} />
              </p>
            </div>
          </div>
        </div>
      )}
      {tab === 'passport' && (
        <div className="card">
          <h3>Digital field passport</h3>
          <p>
            Identity {plot.plotNumber} · {formatArea(plot.area, plot.areaUnit)} · ownership {plot.ownership || 'unknown'} ·
            soil {plot.soilType || 'not recorded'}
          </p>
          <p>
            Soil tests:{' '}
            {state.soilTests
              .filter((s) => s.plotId === plot.id)
              .map((s) => `${s.date} pH ${s.ph ?? '—'}`)
              .join('; ') || 'none'}
          </p>
          <p>
            Disease history:{' '}
            {state.diseases
              .filter((d) => d.plotId === plot.id)
              .map((d) => `${d.date} ${d.name} (${d.confidence})`)
              .join('; ') || 'none'}
          </p>
          <p>
            Harvest batches:{' '}
            {state.harvests
              .filter((h) => h.plotId === plot.id)
              .map((h) => `${h.batch} ${h.quantity} ${h.unit}`)
              .join('; ') || 'none'}
          </p>
          <p className="lede">Older crop cycles stay in the Crops tab. Nothing here overwrites 2025 when 2026 starts.</p>
        </div>
      )}
      <Modal title="Edit plot" open={open === 'plot'} onClose={() => setOpen(null)}>
        <PlotMetaForm plot={plot} onDone={() => setOpen(null)} />
      </Modal>
      <Modal title="Add activity" open={open === 'activity'} onClose={() => setOpen(null)}>
        <ActivityForm plots={plots} plotId={plot.id} onDone={() => setOpen(null)} />
      </Modal>
      <Modal title="New crop cycle" open={open === 'crop'} onClose={() => setOpen(null)}>
        <CropForm plots={plots} plotId={plot.id} onDone={() => setOpen(null)} />
      </Modal>
      <Modal title="Add expense" open={open === 'expense'} onClose={() => setOpen(null)}>
        <ExpenseForm plots={plots} plotId={plot.id} onDone={() => setOpen(null)} />
      </Modal>
      <Modal title="Add income" open={open === 'income'} onClose={() => setOpen(null)}>
        <IncomeForm plots={plots} plotId={plot.id} onDone={() => setOpen(null)} />
      </Modal>
    </div>
  )
}
