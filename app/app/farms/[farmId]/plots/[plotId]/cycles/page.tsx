import Link from 'next/link'
import { requirePlot } from '@/lib/access'
import { groupCyclesByYear, plotCyclesWithMoney } from '@/lib/cycle-views'
import { Card, CardHint, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty'
import { Table, Td, Th } from '@/components/ui/table'
import { PageHeader } from '@/components/PageHeader'
import { inr } from '@/lib/utils'
import { cyclePeriod } from '@/lib/cycle-span'

export default async function PlotCyclesPage({
  params,
}: {
  params: Promise<{ farmId: string; plotId: string }>
}) {
  const { farmId, plotId } = await params
  await requirePlot(farmId, plotId)
  const rows = await plotCyclesWithMoney(farmId, plotId)
  const years = groupCyclesByYear(rows)
  const base = `/app/farms/${farmId}/plots/${plotId}`
  return (
    <div className="space-y-5">
      <PageHeader
        title="Crop cycles"
        hint="Plot totals stay above. Open a year or a cycle for that season’s book."
      />
      {years.length ? (
        <>
          <Card>
            <CardTitle>Year wise</CardTitle>
            <CardHint className="mt-1">All cycles planted in that year, rolled up.</CardHint>
            <Table className="mt-4">
              <thead>
                <tr>
                  <Th>Year</Th>
                  <Th>Cycles</Th>
                  <Th className="text-right">Cost</Th>
                  <Th className="text-right">Revenue</Th>
                  <Th className="text-right">Profit</Th>
                </tr>
              </thead>
              <tbody>
                {years.map((y) => (
                  <tr key={y.year}>
                    <Td>
                      <Link href={`${base}/years/${y.year}`} className="font-medium text-primary">
                        {y.year}
                      </Link>
                    </Td>
                    <Td>{y.items.map((i) => i.cycle.crop.name).join(', ')}</Td>
                    <Td className="num text-right">{inr(y.money.expenses)}</Td>
                    <Td className="num text-right">{inr(y.money.revenue)}</Td>
                    <Td className="num text-right">{inr(y.money.profit)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
          <Card>
            <CardTitle>Crop cycle wise</CardTitle>
            <CardHint className="mt-1">Each row is one planting. History is never overwritten.</CardHint>
            <Table className="mt-4">
              <thead>
                <tr>
                  <Th>Year</Th>
                  <Th>Crop</Th>
                  <Th>Months</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Cost</Th>
                  <Th className="text-right">Revenue</Th>
                  <Th className="text-right">Profit</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ cycle, money }) => (
                  <tr key={cycle.id}>
                    <Td>
                      <Link href={`${base}/years/${cycle.year}`} className="text-primary">
                        {cycle.year}
                      </Link>
                    </Td>
                    <Td>
                      <Link href={`${base}/cycles/${cycle.id}`} className="font-medium text-primary">
                        {cycle.crop.name}
                      </Link>
                    </Td>
                    <Td>{cyclePeriod(cycle)}</Td>
                    <Td className="capitalize">{cycle.status}</Td>
                    <Td className="num text-right">{inr(money.expenses)}</Td>
                    <Td className="num text-right">{inr(money.revenue)}</Td>
                    <Td className="num text-right">{inr(money.profit)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </>
      ) : (
        <EmptyState title="No crop cycles" body="Plant a new cycle from the crop tab. The plot stays; history is kept." />
      )}
    </div>
  )
}
