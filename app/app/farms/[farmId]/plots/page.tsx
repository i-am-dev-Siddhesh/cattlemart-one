import Link from 'next/link'
import { requireFarm } from '@/lib/access'
import { prisma } from '@/lib/prisma'
import { plotFinance } from '@/lib/services/finance'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty'
import { Table, Td, Th } from '@/components/ui/table'
import { PageHeader } from '@/components/PageHeader'
import { acres, inr } from '@/lib/utils'

export default async function FarmPlots({ params }: { params: Promise<{ farmId: string }> }) {
  const { farmId } = await params
  await requireFarm(farmId)
  const plots = await prisma.plot.findMany({
    where: { farmId },
    include: { cycles: { include: { crop: true }, orderBy: { year: 'desc' }, take: 1 } },
    orderBy: { code: 'asc' },
  })
  const rows = await Promise.all(plots.map(async (p) => ({ p, m: await plotFinance(p.id) })))
  return (
    <div className="space-y-5">
      <PageHeader
        title="Plots"
        hint="Permanent land records. Open a row for history and money."
        action={
          <Button asChild>
            <Link href={`/app/farms/${farmId}/map`}>Draw on map</Link>
          </Button>
        }
      />
      {rows.length ? (
        <Card>
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
                  <Td className="num">{acres(p.acres)}</Td>
                  <Td className="capitalize">{p.status}</Td>
                  <Td className="num text-right">{inr(m.expenses)}</Td>
                  <Td className="num text-right">{inr(m.revenue)}</Td>
                  <Td className="num text-right">{inr(m.profit)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : (
        <EmptyState title="No plots yet" body="Draw the first boundary on the farm map." />
      )}
    </div>
  )
}
