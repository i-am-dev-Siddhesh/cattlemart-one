import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { farmTotals } from '../finance'
import { useActiveFarm, useFarmStore } from '../store'
import { formatArea, formatMoney } from '../units'

type SortKey = 'profit' | 'expense' | 'income' | 'costPerAcre' | 'profitPerAcre' | 'yield' | 'area'

export function ComparePage() {
  const farm = useActiveFarm()
  const state = useFarmStore()
  const navigate = useNavigate()
  const [sort, setSort] = useState<SortKey>('profit')
  const totals = farm ? farmTotals(state, farm.id) : null
  const rows = useMemo(() => {
    const list = totals?.rows.slice() || []
    list.sort((a, b) => {
      if (sort === 'yield') return (b.yieldAmount || 0) - (a.yieldAmount || 0)
      if (sort === 'area') return b.plot.area - a.plot.area
      if (sort === 'expense') return a.expense - b.expense
      return (b[sort] as number) - (a[sort] as number)
    })
    return list
  }, [totals, sort])

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Compare plots</h2>
          <p className="lede">Which field pays? Sort by profit, cost, revenue, or yield.</p>
        </div>
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <label>
          Sort by{' '}
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="profit">Highest profit</option>
            <option value="expense">Lowest cost</option>
            <option value="income">Highest revenue</option>
            <option value="costPerAcre">Cost per acre</option>
            <option value="profitPerAcre">Profit per acre</option>
            <option value="yield">Yield</option>
            <option value="area">Area</option>
          </select>
        </label>
      </div>
      <div className="card">
        <table className="data">
          <thead>
            <tr>
              <th>Plot</th>
              <th>Area</th>
              <th>Crop</th>
              <th>Expense</th>
              <th>Revenue</th>
              <th>Profit</th>
              <th>₹ / acre</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.plot.id} className="clickable" onClick={() => navigate(`/plots/${r.plot.id}`)}>
                <td>
                  <span className="swatch" style={{ background: r.plot.color }} />
                  {r.plot.name}
                </td>
                <td>{formatArea(r.plot.area, r.plot.areaUnit)}</td>
                <td>{r.crop}</td>
                <td>{formatMoney(r.expense)}</td>
                <td>{formatMoney(r.income)}</td>
                <td>{formatMoney(r.profit)}</td>
                <td>{formatMoney(r.profitPerAcre)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
