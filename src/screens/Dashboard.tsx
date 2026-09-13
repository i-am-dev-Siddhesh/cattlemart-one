import { Link, useNavigate } from 'react-router-dom'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { FarmMap } from '../components/FarmMap'
import { Button, Money, Stat } from '../components/ui'
import { currentCycle, expenseBreakdown, farmTotals } from '../finance'
import { buildAlerts } from '../farmos'
import { t } from '../i18n'
import { useActiveFarm, useFarmStore } from '../store'
import { convertArea, formatArea, formatDate, formatMoney } from '../units'

const COLORS = ['#1f4d32', '#c45c26', '#b0892e', '#3d6b8a', '#6b3d5a', '#4a7c59', '#8c4a2f']

export function DashboardPage() {
  const farm = useActiveFarm()
  const state = useFarmStore()
  const navigate = useNavigate()
  if (!farm) {
    return (
      <div>
        <div className="topbar">
          <div>
            <h2>Welcome to Kshetra</h2>
            <p className="lede">Create your first farm, draw the boundary, then divide it into plots.</p>
          </div>
          <Button onClick={() => navigate('/settings')}>Add farm</Button>
        </div>
      </div>
    )
  }
  const plots = state.plots.filter((p) => p.farmId === farm.id)
  const totals = farmTotals(state, farm.id)
  const cultivated = plots.filter((p) => p.status === 'active').reduce((s, p) => s + p.area, 0)
  const expenses = state.expenses.filter((e) => plots.some((p) => p.id === e.plotId))
  const breakdown = expenseBreakdown(expenses).slice(0, 6)
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = [...state.activities]
    .filter((a) => plots.some((p) => p.id === a.plotId) && a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6)
  const recent = [...state.activities]
    .filter((a) => plots.some((p) => p.id === a.plotId) && a.date < today)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6)
  const typeName = (id: string) => state.activityTypes.find((t) => t.id === id)?.name || id
  const plotName = (id: string) => plots.find((p) => p.id === id)?.name || id

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>{farm.name}</h2>
          <p className="lede">
            {farm.location}. Map → plot → crop → inputs → labour → water → health → cost → harvest → profit → history.
            Click a plot for its passport.
          </p>
        </div>
        <div className="row">
          <Button kind="secondary" onClick={() => navigate('/assistant')}>
            Ask Cattlemart One
          </Button>
          <Button onClick={() => navigate('/map')}>Open farm map</Button>
        </div>
      </div>
      <div className="stats">
        <Stat
          label="Total area"
          value={formatArea(
            plots.reduce((s, p) => s + convertArea(p.area, p.areaUnit, farm.areaUnit), 0) || farm.totalArea,
            farm.areaUnit,
          )}
        />
        <Stat label="Plots" value={String(plots.length)} />
        <Stat label="Total expenses" value={formatMoney(totals.expense)} />
        <Stat label="Total revenue" value={formatMoney(totals.income)} />
        <Stat label="Net profit" value={formatMoney(totals.profit)} tone={totals.profit >= 0 ? 'good' : 'bad'} />
      </div>
      <div className="grid-2">
        <FarmMap farm={farm} plots={plots} compact onSelectPlot={(id) => navigate(`/plots/${id}`)} />
        <div className="card">
          <h3>Plot performance</h3>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Plot</th>
                  <th>Crop</th>
                  <th>Profit</th>
                </tr>
              </thead>
              <tbody>
                {totals.rows.map((r) => (
                  <tr key={r.plot.id} className="clickable" onClick={() => navigate(`/plots/${r.plot.id}`)}>
                    <td>
                      <span className="swatch" style={{ background: r.plot.color }} />
                      {r.plot.name}
                    </td>
                    <td>{r.crop}</td>
                    <td>
                      <Money n={r.profit} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="lede">
            Active plots {plots.filter((p) => p.status === 'active').length} · Cultivated {formatArea(cultivated, farm.areaUnit)} · Avg
            profit / acre {formatMoney(totals.avgProfitPerAcre)}
          </p>
        </div>
      </div>
      <div className="grid-3" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Current crops</h3>
          {plots.map((p) => {
            const c = currentCycle(state.cropCycles, p.id)
            return (
              <div key={p.id} className="plot-chip">
                <span className="swatch" style={{ background: p.color }} />
                <div>
                  <strong>{p.name}</strong>
                  <div className="lede">
                    {c ? `${c.cropName} · ${c.season}` : 'No crop yet'} · {t(`plotStatus.${p.status}`)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="card">
          <h3>Expense breakdown</h3>
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={breakdown} dataKey="amount" nameKey="key" innerRadius={50} outerRadius={80}>
                  {breakdown.map((e, i) => (
                    <Cell key={e.key} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatMoney(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {breakdown.map((b) => (
            <div key={b.key} className="row">
              <span>{t(`expense.${b.key}`)}</span>
              <span className="spacer" />
              <Money n={b.amount} />
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Upcoming</h3>
          {upcoming.length === 0 && <p className="lede">Nothing scheduled.</p>}
          {upcoming.map((a) => (
            <div key={a.id} className="plot-chip">
              <div>
                <strong>{typeName(a.activityTypeId)}</strong>
                <div className="lede">
                  {plotName(a.plotId)} · {formatDate(a.date)}
                </div>
              </div>
            </div>
          ))}
          <h3>Recent</h3>
          {recent.map((a) => (
            <div key={a.id} className="plot-chip">
              <div>
                <strong>{typeName(a.activityTypeId)}</strong>
                <div className="lede">
                  {plotName(a.plotId)} · {formatDate(a.date)} · {formatMoney(a.totalCost)}
                </div>
              </div>
            </div>
          ))}
          <Link to="/calendar">Open calendar →</Link>
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Alerts from the book</h3>
        {buildAlerts(state).length === 0 && <p className="lede">No due tasks or low stock on file.</p>}
        {buildAlerts(state).map((a) => (
          <p key={a.text}>{a.text}</p>
        ))}
        <p className="lede">
          Low stock {state.inventory.filter((i) => i.farmId === farm.id && i.quantity <= i.minStock).length} · Open
          disease notes {state.diseases.length} · Pending tasks{' '}
          {state.tasks.filter((x) => x.farmId === farm.id && x.status !== 'completed').length}
        </p>
      </div>
    </div>
  )
}
