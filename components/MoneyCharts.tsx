'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardHint, CardTitle } from '@/components/ui/card'
import { inr, inrShort } from '@/lib/utils'

const SPEND = '#e11d48'
const EARN = '#16a34a'

const axis = { fontSize: 12, fill: '#64748b' }
const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  fontSize: 13,
}

export function SpendByCategoryChart({
  data,
}: {
  data: { category: string; amount: number }[]
}) {
  const rows = [...data]
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 7)
    .map((r) => ({ ...r, category: r.category.replace(/_/g, ' ') }))
  const total = rows.reduce((s, r) => s + r.amount, 0)
  const biggest = rows[0]

  return (
    <Card>
      <CardHint>Money out</CardHint>
      <CardTitle>Where your money went</CardTitle>
      {rows.length ? (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            Biggest cost is {biggest.category} — {inr(biggest.amount)} of {inr(total)}.
          </p>
          <div className="mt-4 h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid horizontal={false} stroke="#eef2f6" />
                <XAxis type="number" tickFormatter={inrShort} tick={axis} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={92}
                  tick={axis}
                  axisLine={false}
                  tickLine={false}
                  className="capitalize"
                />
                <Tooltip
                  formatter={(v) => [inr(Number(v)), 'Spent'] as [string, string]}
                  contentStyle={tooltipStyle}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={18}>
                  {rows.map((r, i) => (
                    <Cell key={r.category} fill={i === 0 ? SPEND : '#fda4af'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <p className="py-14 text-center text-sm text-muted-foreground">
          No expenses saved yet. Use Log entry → Expense.
        </p>
      )}
    </Card>
  )
}

export function MonthlyMoneyChart({
  data,
}: {
  data: { month: string; spent: number; earned: number }[]
}) {
  const any = data.some((r) => r.spent > 0 || r.earned > 0)
  const spent = data.reduce((s, r) => s + r.spent, 0)
  const earned = data.reduce((s, r) => s + r.earned, 0)

  return (
    <Card>
      <CardHint>Last 6 months</CardHint>
      <CardTitle>Money in and out</CardTitle>
      {any ? (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            Spent {inr(spent)} · earned {inr(earned)} · {earned - spent >= 0 ? 'profit' : 'loss'}{' '}
            {inr(Math.abs(earned - spent))}.
          </p>
          <div className="mt-4 h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} stroke="#eef2f6" />
                <XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={inrShort} tick={axis} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v, name) =>
                    [inr(Number(v)), name === 'spent' ? 'Money out' : 'Money in'] as [string, string]
                  }
                  contentStyle={tooltipStyle}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="spent" name="spent" fill={SPEND} radius={[6, 6, 0, 0]} barSize={14} />
                <Bar dataKey="earned" name="earned" fill={EARN} radius={[6, 6, 0, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-full" style={{ background: SPEND }} /> Money out
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-full" style={{ background: EARN }} /> Money in
            </span>
          </div>
        </>
      ) : (
        <p className="py-14 text-center text-sm text-muted-foreground">
          Nothing recorded in the last 6 months.
        </p>
      )}
    </Card>
  )
}
