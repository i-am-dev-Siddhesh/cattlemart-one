import { useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ExpenseForm, IncomeForm } from '../components/forms'
import { Button, Modal, Money, Stat } from '../components/ui'
import { expenseBreakdown, farmTotals } from '../finance'
import { t } from '../i18n'
import { useActiveFarm, useFarmStore } from '../store'
import { formatMoney } from '../units'

const COLORS = ['#1f4d32', '#c45c26', '#b0892e', '#3d6b8a', '#6b3d5a', '#4a7c59']

export function FinancePage() {
  const farm = useActiveFarm()
  const state = useFarmStore()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [open, setOpen] = useState<'expense' | 'income' | null>(null)
  const plots = state.plots.filter((p) => p.farmId === farm?.id)
  const range = useMemo(() => ({ from: from || undefined, to: to || undefined }), [from, to])
  const totals = farm ? farmTotals(state, farm.id, range) : null
  const expenses = state.expenses.filter((e) => plots.some((p) => p.id === e.plotId))
  const incomes = state.incomes.filter((e) => plots.some((p) => p.id === e.plotId))
  const filteredExp = expenses.filter((e) => (!from || e.date >= from) && (!to || e.date <= to))
  const filteredInc = incomes.filter((e) => (!from || e.date >= from) && (!to || e.date <= to))
  const breakdown = expenseBreakdown(filteredExp)

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Finance</h2>
          <p className="lede">Every rupee sits on a plot. Farm totals are only the sum of plot books.</p>
        </div>
        <div className="row">
          <Button kind="secondary" onClick={() => setOpen('expense')}>
            Expense
          </Button>
          <Button onClick={() => setOpen('income')}>Income</Button>
        </div>
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <label className="field">
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="field">
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>
      {totals && (
        <div className="stats">
          <Stat label="Expenses" value={formatMoney(totals.expense)} />
          <Stat label="Revenue" value={formatMoney(totals.income)} />
          <Stat label="Profit" value={formatMoney(totals.profit)} tone={totals.profit >= 0 ? 'good' : 'bad'} />
          <Stat label="Profit / acre" value={formatMoney(totals.avgProfitPerAcre)} />
          <Stat label="Plots" value={String(totals.plots.length)} />
        </div>
      )}
      <div className="grid-2">
        <div className="card">
          <h3>By plot</h3>
          <table className="data">
            <thead>
              <tr>
                <th>Plot</th>
                <th>Expense</th>
                <th>Income</th>
                <th>Profit</th>
              </tr>
            </thead>
            <tbody>
              {totals?.rows.map((r) => (
                <tr key={r.plot.id}>
                  <td>{r.plot.name}</td>
                  <td>{formatMoney(r.expense)}</td>
                  <td>{formatMoney(r.income)}</td>
                  <td>
                    <Money n={r.profit} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3>Expense mix</h3>
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={breakdown} dataKey="amount" nameKey="key" innerRadius={48} outerRadius={80}>
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
      </div>
      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Expenses</h3>
          {filteredExp
            .slice()
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((e) => (
              <div key={e.id} className="row">
                <span>
                  {e.date} · {plots.find((p) => p.id === e.plotId)?.name} · {t(`expense.${e.category}`)}
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
          {filteredInc
            .slice()
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((e) => (
              <div key={e.id} className="row">
                <span>
                  {e.date} · {plots.find((p) => p.id === e.plotId)?.name} · {t(`income.${e.category}`)}
                </span>
                <span className="spacer" />
                <Money n={e.amount} />
                <Button small kind="danger" onClick={() => state.deleteIncome(e.id)}>
                  ×
                </Button>
              </div>
            ))}
        </div>
      </div>
      <Modal title="Add expense" open={open === 'expense'} onClose={() => setOpen(null)}>
        <ExpenseForm plots={plots} onDone={() => setOpen(null)} />
      </Modal>
      <Modal title="Add income" open={open === 'income'} onClose={() => setOpen(null)}>
        <IncomeForm plots={plots} onDone={() => setOpen(null)} />
      </Modal>
    </div>
  )
}
