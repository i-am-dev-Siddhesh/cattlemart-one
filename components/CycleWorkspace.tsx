'use client'

import Link from 'next/link'
import { Card, CardHint, CardTitle } from '@/components/ui/card'
import { EmptyState, Metric } from '@/components/ui/empty'
import { Table, Td, Th } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { inr } from '@/lib/utils'

type Line = { id: string; date: string; label: string; amount?: number; extra?: string }

export function CycleWorkspace({
  title,
  hint,
  backHref,
  backLabel,
  money,
  cycles,
  activities,
  expenses,
  sales,
  labour,
  harvests,
  irrigations,
}: {
  title: string
  hint: string
  backHref: string
  backLabel: string
  money: { expenses: number; revenue: number; profit: number; yieldQty: number }
  cycles?: { id: string; href: string; crop: string; season: string; status: string; expenses: number; revenue: number; profit: number }[]
  activities: Line[]
  expenses: Line[]
  sales: Line[]
  labour: Line[]
  harvests: Line[]
  irrigations: Line[]
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link href={backHref} className="text-primary">
              {backLabel}
            </Link>
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Cost" value={inr(money.expenses)} hint="This cycle / year only" />
        <Metric label="Revenue" value={inr(money.revenue)} hint="Actual sales" />
        <Metric label="Profit" value={inr(money.profit)} hint="Revenue − cost" />
        <Metric label="Yield recorded" value={money.yieldQty ? String(money.yieldQty) : '—'} />
      </div>
      {cycles?.length ? (
        <Card>
          <CardTitle>Crop cycles in this year</CardTitle>
          <CardHint className="mt-1">Open a cycle for the full ledger.</CardHint>
          <Table className="mt-4">
            <thead>
              <tr>
                <Th>Crop</Th>
                <Th>Months</Th>
                <Th>Status</Th>
                <Th className="text-right">Cost</Th>
                <Th className="text-right">Revenue</Th>
                <Th className="text-right">Profit</Th>
              </tr>
            </thead>
            <tbody>
              {cycles.map((c) => (
                <tr key={c.id}>
                  <Td>
                    <Link href={c.href} className="font-medium text-primary">
                      {c.crop}
                    </Link>
                  </Td>
                  <Td>{c.season}</Td>
                  <Td className="capitalize">{c.status}</Td>
                  <Td className="num text-right">{inr(c.expenses)}</Td>
                  <Td className="num text-right">{inr(c.revenue)}</Td>
                  <Td className="num text-right">{inr(c.profit)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : null}
      <Card>
        <Tabs defaultValue="activities">
          <TabsList>
            <TabsTrigger value="activities">Activity log</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="labour">Labour</TabsTrigger>
            <TabsTrigger value="harvests">Harvest</TabsTrigger>
            <TabsTrigger value="irrigation">Irrigation</TabsTrigger>
          </TabsList>
          <TabsContent value="activities">
            <Ledger rows={activities} empty="No activities on this cycle." money />
          </TabsContent>
          <TabsContent value="expenses">
            <Ledger rows={expenses} empty="No expenses posted to this cycle." money />
          </TabsContent>
          <TabsContent value="sales">
            <Ledger rows={sales} empty="No sales on this cycle." money />
          </TabsContent>
          <TabsContent value="labour">
            <Ledger rows={labour} empty="No labour on this cycle." money />
          </TabsContent>
          <TabsContent value="harvests">
            <Ledger rows={harvests} empty="No harvest quantity recorded." />
          </TabsContent>
          <TabsContent value="irrigation">
            <Ledger rows={irrigations} empty="No irrigation records." />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}

function Ledger({ rows, empty, money }: { rows: Line[]; empty: string; money?: boolean }) {
  if (!rows.length) return <EmptyState title="Nothing here" body={empty} />
  return (
    <Table>
      <thead>
        <tr>
          <Th>Date</Th>
          <Th>Detail</Th>
          {money ? <Th className="text-right">Amount</Th> : <Th>Note</Th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <Td>{r.date}</Td>
            <Td>{r.label}</Td>
            {money ? (
              <Td className="num text-right">{r.amount != null ? inr(r.amount) : '—'}</Td>
            ) : (
              <Td>{r.extra ?? '—'}</Td>
            )}
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
