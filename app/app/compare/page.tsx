import { currentFarm } from '@/lib/context'
import { prisma } from '@/lib/prisma'
import { cycleFinance } from '@/lib/services/finance'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty'
import { Table, Td, Th } from '@/components/ui/table'
import { PageHeader } from '@/components/PageHeader'
import { inr } from '@/lib/utils'
import { cyclePeriod } from '@/lib/cycle-span'

export default async function ComparePage() {
  const ctx = await currentFarm()
  if (!ctx?.farm) return <EmptyState title="No farm" body="Select a farm." />
  const cycles = await prisma.cropCycle.findMany({
    where: { plot: { farmId: ctx.farm.id } },
    include: { crop: true, plot: true },
    orderBy: [{ plot: { code: 'asc' } }, { year: 'desc' }],
  })
  const rows = await Promise.all(cycles.map(async (c) => ({ c, m: await cycleFinance(c.id) })))
  return (
    <div className="space-y-4">
      <PageHeader title="Season comparison" hint="Each row is a stored crop cycle." />
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Plot</Th>
              <Th>Period</Th>
              <Th>Crop</Th>
              <Th className="text-right">Cost</Th>
              <Th className="text-right">Revenue</Th>
              <Th className="text-right">Yield</Th>
              <Th className="text-right">Profit</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, m }) => (
              <tr key={c.id}>
                <Td>{c.plot.name}</Td>
                <Td>{cyclePeriod(c)}</Td>
                <Td>{c.crop.name}</Td>
                <Td className="num text-right">{inr(m.expenses)}</Td>
                <Td className="num text-right">{inr(m.revenue)}</Td>
                <Td className="num text-right">{m.yieldQty || '—'}</Td>
                <Td className="num text-right">{inr(m.profit)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}
