import Link from 'next/link'
import { currentFarm } from '@/lib/context'
import { prisma } from '@/lib/prisma'
import { CropCatalog } from '@/components/CropCatalog'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty'
import { PageHeader } from '@/components/PageHeader'
import { Table, Td, Th } from '@/components/ui/table'
import { cyclePeriod } from '@/lib/cycle-span'

export default async function CropsPage() {
  const ctx = await currentFarm()
  if (!ctx?.farm) return <EmptyState title="Select a farm" body="Create or choose a farm first." />
  const farmId = ctx.farm.id

  const [crops, cycles] = await Promise.all([
    prisma.crop.findMany({
      where: { farmId },
      include: { _count: { select: { cycles: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.cropCycle.findMany({
      where: { plot: { farmId } },
      include: { crop: true, plot: true },
      orderBy: [{ year: 'desc' }],
    }),
  ])

  return (
    <div className="space-y-4">
      <PageHeader title="Crops" hint="Manage crop types, then plant cycles on plots. History is never overwritten." />
      <Card>
        <CropCatalog
          farmId={farmId}
          crops={crops.map((crop) => ({
            id: crop.id,
            name: crop.name,
            localName: crop.localName,
            scientificName: crop.scientificName,
            cycleCount: crop._count.cycles,
          }))}
        />
      </Card>
      <Card>
        <h2 className="text-base font-semibold">Planted cycles</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Each row is a season on a plot.</p>
        {cycles.length ? (
          <div className="mt-3">
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
                {cycles.map((cycle) => (
                  <tr key={cycle.id}>
                    <Td>
                      <Link href={`/app/farms/${farmId}/plots/${cycle.plotId}`} className="text-primary">
                        {cycle.plot.name}
                      </Link>
                    </Td>
                    <Td>{cyclePeriod(cycle)}</Td>
                    <Td>{cycle.crop.name}</Td>
                    <Td className="capitalize">{cycle.status}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <div className="mt-3">
            <EmptyState title="No crop cycles" body="Plant a cycle from the dashboard or a plot crop tab." />
          </div>
        )}
      </Card>
    </div>
  )
}
