import Link from 'next/link'
import { requireFarm } from '@/lib/access'
import { prisma } from '@/lib/prisma'
import { plotFinance } from '@/lib/services/finance'
import { farmCenter } from '@/lib/geo'
import { Card } from '@/components/ui/card'
import { DrawPlotLazy } from '@/components/DrawPlotLazy'
import { PageHeader } from '@/components/PageHeader'
import { inr } from '@/lib/utils'

export default async function FarmMapPage({ params }: { params: Promise<{ farmId: string }> }) {
  const { farmId } = await params
  const { farm } = await requireFarm(farmId)
  const [plots, crops] = await Promise.all([
    prisma.plot.findMany({ where: { farmId }, orderBy: { code: 'asc' } }),
    prisma.crop.findMany({ where: { farmId } }),
  ])
  const cards = await Promise.all(plots.map(async (p) => ({ p, m: await plotFinance(p.id) })))
  const center = farmCenter(farm, plots)
  return (
    <div className="space-y-5">
      <PageHeader
        title={`${farm.name} map`}
        hint="Search this farm’s village. The dashed box moves there so you can draw plots."
      />
      <DrawPlotLazy
        farmId={farmId}
        center={center}
        crops={crops}
        plots={plots.map((p) => ({ id: p.id, name: p.name, geoJson: p.geoJson }))}
        farm={{ geoJson: farm.geoJson, lat: farm.lat, lng: farm.lng }}
      />
      <Card>
          <h2 className="text-base font-semibold">Plots on this farm</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {cards.map(({ p, m }) => (
              <li key={p.id}>
                <Link href={`/app/farms/${farmId}/plots/${p.id}`} className="font-medium text-primary">
                  {p.name}
                </Link>
                <p className="text-muted-foreground">
                  {inr(m.expenses)} cost · {inr(m.revenue)} revenue
                </p>
              </li>
            ))}
          </ul>
        </Card>
    </div>
  )
}
