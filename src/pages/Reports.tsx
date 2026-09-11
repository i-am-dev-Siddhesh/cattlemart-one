import { useState } from 'react'
import { Button } from '../components/ui'
import { currentCycle, expenseBreakdown, farmTotals, summarizePlot } from '../finance'
import { t } from '../i18n'
import { downloadCsv, downloadPdf, downloadXls } from '../lib/export'
import { useActiveFarm, useFarmStore } from '../store'
import { formatArea, formatDate, formatMoney } from '../units'

export function ReportsPage() {
  const farm = useActiveFarm()
  const state = useFarmStore()
  const [plotId, setPlotId] = useState('')
  if (!farm) return <p>Create a farm first.</p>
  const plots = state.plots.filter((p) => p.farmId === farm.id)
  const totals = farmTotals(state, farm.id)
  const expenses = state.expenses.filter((e) => plots.some((p) => p.id === e.plotId))
  const plot = plots.find((p) => p.id === plotId)

  const farmRows: (string | number)[][] = [
    ['Plot', 'Area', 'Crop', 'Expense', 'Revenue', 'Profit'],
    ...totals.rows.map((r) => [
      r.plot.name,
      formatArea(r.plot.area, r.plot.areaUnit),
      r.crop,
      r.expense,
      r.income,
      r.profit,
    ]),
  ]

  const cropMap = new Map<string, { expense: number; income: number }>()
  for (const r of totals.rows) {
    const cur = cropMap.get(r.crop) || { expense: 0, income: 0 }
    cropMap.set(r.crop, { expense: cur.expense + r.expense, income: cur.income + r.income })
  }

  const exportAll = (kind: 'csv' | 'xls' | 'pdf') => {
    if (kind === 'csv') downloadCsv('farm-report.csv', farmRows)
    if (kind === 'xls') downloadXls('farm-report.xls', farmRows)
    if (kind === 'pdf') downloadPdf(`${farm.name} report`, farmRows)
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Reports</h2>
          <p className="lede">Farm performance, plot books, and crop-wise profit. Export CSV, Excel, or PDF.</p>
        </div>
        <div className="row">
          <Button kind="secondary" onClick={() => exportAll('csv')}>
            CSV
          </Button>
          <Button kind="secondary" onClick={() => exportAll('xls')}>
            Excel
          </Button>
          <Button onClick={() => exportAll('pdf')}>PDF</Button>
        </div>
      </div>
      <div className="card">
        <h3>Farm report — {farm.name}</h3>
        <p>
          Area {formatArea(totals.acres, 'acre')} · Plots {plots.length} · Expense {formatMoney(totals.expense)} ·
          Revenue {formatMoney(totals.income)} · Profit {formatMoney(totals.profit)}
        </p>
        <table className="data">
          <thead>
            <tr>
              {farmRows[0].map((h) => (
                <th key={String(h)}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {totals.rows.map((r) => (
              <tr key={r.plot.id}>
                <td>{r.plot.name}</td>
                <td>{formatArea(r.plot.area, r.plot.areaUnit)}</td>
                <td>{r.crop}</td>
                <td>{formatMoney(r.expense)}</td>
                <td>{formatMoney(r.income)}</td>
                <td>{formatMoney(r.profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3 style={{ marginTop: 24 }}>Crop-wise</h3>
        <table className="data">
          <thead>
            <tr>
              <th>Crop</th>
              <th>Expense</th>
              <th>Revenue</th>
              <th>Profit</th>
            </tr>
          </thead>
          <tbody>
            {[...cropMap.entries()].map(([crop, v]) => (
              <tr key={crop}>
                <td>{crop}</td>
                <td>{formatMoney(v.expense)}</td>
                <td>{formatMoney(v.income)}</td>
                <td>{formatMoney(v.income - v.expense)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3 style={{ marginTop: 24 }}>Expense breakdown</h3>
        {expenseBreakdown(expenses).map((b) => (
          <div key={b.key} className="row">
            <span>{t(`expense.${b.key}`)}</span>
            <span className="spacer" />
            <span>{formatMoney(b.amount)}</span>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Plot report</h3>
        <select value={plotId} onChange={(e) => setPlotId(e.target.value)}>
          <option value="">Choose a plot</option>
          {plots.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {plot && <PlotReport plotId={plot.id} />}
      </div>
    </div>
  )
}

function PlotReport({ plotId }: { plotId: string }) {
  const state = useFarmStore()
  const plot = state.plots.find((p) => p.id === plotId)!
  const fin = summarizePlot(state, plot)
  const cycles = state.cropCycles.filter((c) => c.plotId === plotId)
  const acts = state.activities.filter((a) => a.plotId === plotId)
  const crop = currentCycle(state.cropCycles, plotId)
  const rows: (string | number)[][] = [
    ['Field', 'Value'],
    ['Plot', plot.name],
    ['ID', plot.plotNumber],
    ['Area', formatArea(plot.area, plot.areaUnit)],
    ['Crop', crop?.cropName || ''],
    ['Expense', fin.expense],
    ['Income', fin.income],
    ['Profit', fin.profit],
  ]
  return (
    <div>
      <div className="row" style={{ margin: '12px 0' }}>
        <Button kind="secondary" small onClick={() => downloadCsv(`${plot.name}.csv`, rows)}>
          CSV
        </Button>
        <Button kind="secondary" small onClick={() => downloadXls(`${plot.name}.xls`, rows)}>
          Excel
        </Button>
        <Button small onClick={() => downloadPdf(`${plot.name} report`, rows)}>
          PDF
        </Button>
      </div>
      <p>
        {plot.plotNumber} · {formatArea(plot.area, plot.areaUnit)} · Notes: {plot.notes}
      </p>
      <p>
        Expense {formatMoney(fin.expense)} · Income {formatMoney(fin.income)} · Profit {formatMoney(fin.profit)}
      </p>
      <h3>Crop history</h3>
      <ul>
        {cycles.map((c) => (
          <li key={c.id}>
            {c.season} · {c.cropName} · yield {c.actualYield ?? c.expectedYield ?? '—'} {c.yieldUnit}
          </li>
        ))}
      </ul>
      <h3>Activities</h3>
      <ul>
        {acts.map((a) => (
          <li key={a.id}>
            {formatDate(a.date)} · {state.activityTypes.find((t) => t.id === a.activityTypeId)?.name} ·{' '}
            {formatMoney(a.totalCost)}
          </li>
        ))}
      </ul>
    </div>
  )
}
