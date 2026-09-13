import Link from 'next/link'
import { format } from 'date-fns'
import { currentFarm } from '@/lib/context'
import { prisma } from '@/lib/prisma'
import { completeTaskAsActivityAction } from '@/lib/actions'
import { ActionForm, SubmitButton } from '@/components/feedback'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty'
import { Table, Td, Th } from '@/components/ui/table'
import { PageHeader } from '@/components/PageHeader'
import { inr } from '@/lib/utils'
import { cyclePeriod } from '@/lib/cycle-span'
import { farmFinance, plotFinance } from '@/lib/services/finance'

export async function FarmList({ kind }: { kind: string }) {
  const ctx = await currentFarm()
  if (!ctx?.farm) return <EmptyState title="Select a farm" body="Create or choose a farm first." />
  const farmId = ctx.farm.id

  if (kind === 'plots') {
    const plots = await prisma.plot.findMany({
      where: { farmId },
      include: { cycles: { include: { crop: true }, orderBy: { year: 'desc' }, take: 1 } },
      orderBy: { code: 'asc' },
    })
    const rows = await Promise.all(plots.map(async (p) => ({ p, m: await plotFinance(p.id) })))
    return (
      <Shell title="Plots" hint="Open a plot to see history and money.">
        <Table>
          <thead>
            <tr>
              <Th>Plot</Th>
              <Th>Crop</Th>
              <Th>Area</Th>
              <Th>Status</Th>
              <Th className="text-right">Cost</Th>
              <Th className="text-right">Revenue</Th>
              <Th className="text-right">Profit</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, m }) => (
              <tr key={p.id}>
                <Td>
                  <Link href={`/app/farms/${farmId}/plots/${p.id}`} className="font-medium text-primary">
                    {p.name}
                  </Link>
                </Td>
                <Td>{p.cycles[0]?.crop.name ?? 'Unplanted'}</Td>
                <Td className="num">{p.acres.toFixed(2)} ac</Td>
                <Td className="capitalize">{p.status}</Td>
                <Td className="num text-right">{inr(m.expenses)}</Td>
                <Td className="num text-right">{inr(m.revenue)}</Td>
                <Td className="num text-right">{inr(m.profit)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Shell>
    )
  }
  if (kind === 'activities') {
    const rows = await prisma.activity.findMany({ where: { farmId }, include: { plot: true }, orderBy: { date: 'desc' }, take: 80 })
    return (
      <Shell title="Activities" hint="Field work posted to plots.">
        {rows.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Plot</Th>
                <Th>Work</Th>
                <Th className="text-right">Cost</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <Td>{format(a.date, 'd MMM yyyy')}</Td>
                  <Td>{a.plot.name}</Td>
                  <Td>{a.type}</Td>
                  <Td className="num text-right">{inr(a.totalCost)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="No activities" body="Log work from the dashboard." />
        )}
      </Shell>
    )
  }
  if (kind === 'expenses') {
    const rows = await prisma.expense.findMany({ where: { farmId, voided: false }, include: { plot: true }, orderBy: { date: 'desc' }, take: 80 })
    return (
      <Shell title="Expenses" hint="Recorded spend only.">
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Plot</Th>
              <Th>Category</Th>
              <Th className="text-right">Amount</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id}>
                <Td>{format(e.date, 'd MMM yyyy')}</Td>
                <Td>{e.plot?.name ?? 'Farm'}</Td>
                <Td className="capitalize">{e.category}</Td>
                <Td className="num text-right">{inr(e.amount)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Shell>
    )
  }
  if (kind === 'inventory') {
    const rows = await prisma.inventoryItem.findMany({ where: { farmId } })
    return (
      <Shell title="Inventory">
        <Table>
          <thead>
            <tr>
              <Th>Item</Th>
              <Th>On hand</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id}>
                <Td>{i.name}</Td>
                <Td className="num">
                  {i.qtyOnHand} {i.unit}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Shell>
    )
  }
  if (kind === 'tasks') {
    const rows = await prisma.task.findMany({ where: { farmId }, include: { plot: true }, orderBy: { createdAt: 'desc' } })
    return (
      <Shell title="Tasks">
        <Table>
          <thead>
            <tr>
              <Th>Task</Th>
              <Th>Plot</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <Td>{t.title}</Td>
                <Td>{t.plot?.name ?? '—'}</Td>
                <Td className="capitalize">{t.status.replaceAll('_', ' ')}</Td>
                <Td>
                  {t.status !== 'completed' ? (
                    <ActionForm
                      ok="Task marked done"
                      action={async () => {
                        'use server'
                        await completeTaskAsActivityAction(t.id, 'Other')
                      }}
                    >
                      <SubmitButton size="sm" variant="outline" pendingLabel="Saving…">
                        Complete as activity
                      </SubmitButton>
                    </ActionForm>
                  ) : null}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Shell>
    )
  }
  if (kind === 'harvests') {
    const rows = await prisma.harvest.findMany({
      where: { plot: { farmId } },
      include: { plot: true, cropCycle: { include: { crop: true } } },
      orderBy: { date: 'desc' },
    })
    return (
      <Shell title="Harvests">
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Plot</Th>
              <Th>Crop</Th>
              <Th className="text-right">Qty</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr key={h.id}>
                <Td>{format(h.date, 'd MMM yyyy')}</Td>
                <Td>{h.plot.name}</Td>
                <Td>{h.cropCycle.crop.name}</Td>
                <Td className="num text-right">
                  {h.quantity} {h.unit}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Shell>
    )
  }
  if (kind === 'sales') {
    const rows = await prisma.sale.findMany({ where: { farmId }, include: { plot: true, buyer: true }, orderBy: { date: 'desc' } })
    return (
      <Shell title="Sales" hint="Revenue from recorded sales.">
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Plot</Th>
              <Th>Status</Th>
              <Th className="text-right">Net</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <Td>{format(s.date, 'd MMM yyyy')}</Td>
                <Td>{s.plot?.name ?? '—'}</Td>
                <Td>{s.paymentStatus}</Td>
                <Td className="num text-right">{inr(s.net)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Shell>
    )
  }
  if (kind === 'cycles') {
    const rows = await prisma.cropCycle.findMany({
      where: { plot: { farmId } },
      include: { crop: true, plot: true },
      orderBy: [{ year: 'desc' }],
    })
    return (
      <Shell title="Crop cycles" hint="History is never overwritten.">
        <Table>
          <thead>
            <tr>
              <Th>Plot</Th>
              <Th>Period</Th>
              <Th>Crop</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <Td>
                  <Link href={`/app/farms/${farmId}/plots/${c.plotId}`} className="text-primary">
                    {c.plot.name}
                  </Link>
                </Td>
                <Td>{cyclePeriod(c)}</Td>
                <Td>{c.crop.name}</Td>
                <Td className="capitalize">{c.status}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Shell>
    )
  }

  const simple = async () => {
    if (kind === 'pests') {
      const rows = await prisma.pestObservation.findMany({ where: { plot: { farmId } }, include: { plot: true }, orderBy: { date: 'desc' } })
      return { title: 'Pests', headers: ['Plot', 'Pest', 'Severity'], rows: rows.map((r) => [r.plot.name, r.pest, r.severity]) }
    }
    if (kind === 'diseases') {
      const rows = await prisma.diseaseObservation.findMany({ where: { plot: { farmId } }, include: { plot: true }, orderBy: { date: 'desc' } })
      return { title: 'Diseases', headers: ['Plot', 'Disease', 'Severity'], rows: rows.map((r) => [r.plot.name, r.disease, r.severity]) }
    }
    if (kind === 'observations') {
      const rows = await prisma.cropObservation.findMany({ where: { plot: { farmId } }, include: { plot: true }, orderBy: { date: 'desc' } })
      return { title: 'Observations', headers: ['Plot', 'Note'], rows: rows.map((r) => [r.plot.name, r.note]) }
    }
    if (kind === 'soil') {
      const rows = await prisma.soilTest.findMany({ where: { plot: { farmId } }, include: { plot: true }, orderBy: { date: 'desc' } })
      return { title: 'Soil tests', headers: ['Plot', 'pH'], rows: rows.map((r) => [r.plot.name, String(r.ph ?? '—')]) }
    }
    if (kind === 'irrigation') {
      const rows = await prisma.irrigationRecord.findMany({ where: { plot: { farmId } }, include: { plot: true }, orderBy: { date: 'desc' } })
      return { title: 'Irrigation', headers: ['Plot', 'Water'], rows: rows.map((r) => [r.plot.name, `${r.quantityL ?? '—'} L`]) }
    }
    if (kind === 'labour') {
      const rows = await prisma.labourRecord.findMany({ where: { plot: { farmId } }, include: { plot: true }, orderBy: { date: 'desc' } })
      return { title: 'Labour', headers: ['Plot', 'Workers', 'Cost'], rows: rows.map((r) => [r.plot?.name ?? '—', String(r.workers), inr(r.cost)]) }
    }
    if (kind === 'machinery') {
      const rows = await prisma.equipment.findMany({ where: { farmId } })
      return { title: 'Machinery', headers: ['Name', 'Kind'], rows: rows.map((r) => [r.name, r.kind]) }
    }
    if (kind === 'fertilizers') {
      const rows = await prisma.fertilizerApplication.findMany({
        where: { cropCycle: { plot: { farmId } } },
        include: { cropCycle: { include: { plot: true } } },
        orderBy: { date: 'desc' },
      })
      return {
        title: 'Fertilizers',
        headers: ['Plot', 'Product', 'Qty'],
        rows: rows.map((r) => [r.cropCycle.plot.name, r.product, `${r.quantity} ${r.unit}`]),
      }
    }
    if (kind === 'protection') {
      const rows = await prisma.cropProtectionApplication.findMany({
        where: { cropCycle: { plot: { farmId } } },
        include: { cropCycle: { include: { plot: true } } },
      })
      return { title: 'Crop protection', headers: ['Product'], rows: rows.map((r) => [r.product]) }
    }
    if (kind === 'workers') {
      const rows = await prisma.worker.findMany({ where: { farmId } })
      return { title: 'Workers', headers: ['Name'], rows: rows.map((r) => [r.name]) }
    }
    if (kind === 'buyers') {
      const rows = await prisma.buyer.findMany({ where: { farmId } })
      return { title: 'Buyers', headers: ['Name'], rows: rows.map((r) => [r.name]) }
    }
    if (kind === 'batches') {
      const rows = await prisma.harvestBatch.findMany({ where: { harvest: { plot: { farmId } } } })
      return { title: 'Batches', headers: ['Code', 'Qty'], rows: rows.map((r) => [r.code, `${r.quantity} ${r.unit}`]) }
    }
    if (kind === 'calendar') {
      const rows = await prisma.activity.findMany({ where: { farmId }, include: { plot: true }, orderBy: { date: 'asc' }, take: 60 })
      return {
        title: 'Calendar',
        headers: ['When', 'Plot', 'Work'],
        rows: rows.map((a) => [format(a.date, 'EEE d MMM'), a.plot.name, a.type]),
      }
    }
    return null
  }

  if (kind === 'profit') {
    const plots = await prisma.plot.findMany({ where: { farmId }, orderBy: { code: 'asc' } })
    const farm = await farmFinance(farmId)
    const rows = await Promise.all(plots.map(async (p) => ({ p, m: await plotFinance(p.id) })))
    return (
      <Shell title="Profitability" hint={`Farm actuals · spend ${inr(farm.expenses)} · sales ${inr(farm.revenue)} · P/L ${inr(farm.profit)}`}>
        <Table>
          <thead>
            <tr>
              <Th>Plot</Th>
              <Th className="text-right">Profit</Th>
              <Th className="text-right">ROI</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, m }) => (
              <tr key={p.id}>
                <Td>{p.name}</Td>
                <Td className="num text-right">{inr(m.profit)}</Td>
                <Td className="num text-right">{m.roi != null ? `${m.roi.toFixed(1)}%` : '—'}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Shell>
    )
  }
  const packed = await simple()
  if (packed) {
    return (
      <Shell title={packed.title}>
        {packed.rows.length ? (
          <Table>
            <thead>
              <tr>
                {packed.headers.map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {packed.rows.map((cols, i) => (
                <tr key={i}>
                  {cols.map((c, j) => (
                    <Td key={j}>{c}</Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="No records" body="Log them from the dashboard activity form." />
        )}
      </Shell>
    )
  }

  return (
    <Shell title={kind}>
      <EmptyState title="Module ready" body="Records appear here when they exist on the selected farm." />
    </Shell>
  )
}

function Shell({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <PageHeader title={title} hint={hint} />
      <Card>{children}</Card>
    </div>
  )
}
