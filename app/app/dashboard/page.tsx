import { currentFarm } from '@/lib/context'
import { dashboardData } from '@/lib/queries'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty'
import { WorkspaceDashboard } from '@/components/WorkspaceDashboard'
import Link from 'next/link'
import { cyclePeriod } from '@/lib/cycle-span'

export default async function DashboardPage() {
  const ctx = await currentFarm()
  if (!ctx?.farm) {
    return (
      <EmptyState
        title="No farm yet"
        body="Create a farm to start the plot book."
        action={
          <Button asChild>
            <Link href="/app/farms">Farms</Link>
          </Button>
        }
      />
    )
  }
  const d = await dashboardData(ctx.farm.id)
  const crops = await prisma.crop.findMany({ where: { farmId: ctx.farm.id } })
  return (
    <WorkspaceDashboard
      farmId={d.farm.id}
      farmName={d.farm.name}
      season={d.farm.season}
      area={d.area}
      activePlots={d.plots.filter((p) => p.status !== 'fallow').length}
      totalPlots={d.plots.length}
      finance={d.finance}
      plotCards={d.plotCards.map(({ plot, money, cycle }) => ({
        plot: {
          id: plot.id,
          name: plot.name,
          code: plot.code,
          acres: plot.acres,
          status: plot.status,
          geoJson: plot.geoJson,
        },
        money,
        cycle: cycle
          ? { crop: { name: cycle.crop.name }, status: cycle.status, year: cycle.year, season: cyclePeriod(cycle) }
          : null,
      }))}
      activities={d.recentActs.map((a) => ({
        id: a.id,
        type: a.type,
        date: a.date.toISOString(),
        totalCost: a.totalCost,
        plot: { id: a.plot.id, name: a.plot.name },
      }))}
      expenses={d.expenses.map((e) => ({
        id: e.id,
        date: e.date.toISOString(),
        plotId: e.plotId,
        plotName: e.plot?.name ?? 'Farm',
        label: e.category,
        amount: e.amount,
      }))}
      sales={d.sales.map((s) => ({
        id: s.id,
        date: s.date.toISOString(),
        plotId: s.plotId,
        plotName: s.plot?.name ?? 'Farm',
        label: `${s.quantity} ${s.unit}`,
        amount: s.net,
      }))}
      labour={d.labour.map((l) => ({
        id: l.id,
        date: l.date.toISOString(),
        plotId: l.plotId,
        plotName: l.plot?.name ?? 'Farm',
        label: `${l.workers} workers`,
        amount: l.cost,
      }))}
      cycles={d.allCycles.map((c) => ({
        id: c.id,
        year: c.year,
        status: c.status,
        season: cyclePeriod(c),
        crop: { name: c.crop.name },
        plot: { name: c.plot.name, id: c.plot.id },
      }))}
      crops={crops.map((c) => ({ id: c.id, name: c.name }))}
      farmLat={d.farm.lat}
      farmLng={d.farm.lng}
      farmGeoJson={d.farm.geoJson}
    />
  )
}
