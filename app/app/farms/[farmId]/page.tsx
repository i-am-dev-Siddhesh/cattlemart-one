import Link from 'next/link'
import { requireFarm } from '@/lib/access'
import { prisma } from '@/lib/prisma'
import { dashboardData } from '@/lib/queries'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Metric } from '@/components/ui/empty'
import { PageHeader } from '@/components/PageHeader'
import { FarmRename } from '@/components/FarmRename'
import { farmSeasonLine } from '@/lib/farm-season'
import { acres, inr } from '@/lib/utils'

export default async function FarmHome({ params }: { params: Promise<{ farmId: string }> }) {
  const { farmId } = await params
  await requireFarm(farmId)
  const d = await dashboardData(farmId)
  const plotCount = await prisma.plot.count({ where: { farmId } })
  return (
    <div className="space-y-5">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            {d.farm.name}
            <FarmRename farmId={farmId} name={d.farm.name} />
          </span>
        }
        hint={farmSeasonLine(d.farm)}
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/app/farms/${farmId}/map`}>Map</Link>
            </Button>
            <Button asChild>
              <Link href={`/app/farms/${farmId}/plots`}>Plots</Link>
            </Button>
          </div>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Plots" value={String(plotCount)} />
        <Metric label="Area" value={acres(d.area)} />
        <Metric label="Profit" value={inr(d.finance.profit)} hint="Actual" />
      </div>
      {d.farm.notes ? (
        <Card>
          <p className="text-sm text-muted-foreground">{d.farm.notes}</p>
        </Card>
      ) : null}
    </div>
  )
}
