import { format } from 'date-fns'
import { requirePlot } from '@/lib/access'
import { cycleDetail } from '@/lib/cycle-views'
import { activityLines, expenseLines, harvestLines, irrigationLines, labourLines, saleLines } from '@/lib/cycle-rows'
import { CycleWorkspace } from '@/components/CycleWorkspace'
import { Card } from '@/components/ui/card'
import { cycleMonths, cyclePeriod, cycleEnd, cycleStart } from '@/lib/cycle-span'

export default async function CropCyclePage({
  params,
}: {
  params: Promise<{ farmId: string; plotId: string; cycleId: string }>
}) {
  const { farmId, plotId, cycleId } = await params
  await requirePlot(farmId, plotId)
  const { cycle, money } = await cycleDetail(farmId, plotId, cycleId)
  const base = `/app/farms/${farmId}/plots/${plotId}`
  return (
    <div className="space-y-4">
      <Card>
        <h3 className="text-sm font-semibold">Cycle identity</h3>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Crop</dt>
          <dd>{cycle.crop.name}</dd>
          <dt className="text-muted-foreground">Variety</dt>
          <dd>{cycle.variety?.name ?? '—'}</dd>
          <dt className="text-muted-foreground">Period</dt>
          <dd>{cyclePeriod(cycle)}</dd>
          <dt className="text-muted-foreground">Months</dt>
          <dd>{cycleMonths(cycle) ?? '—'}</dd>
          <dt className="text-muted-foreground">Start</dt>
          <dd>{cycleStart(cycle) ? format(cycleStart(cycle)!, 'd MMM yyyy') : '—'}</dd>
          <dt className="text-muted-foreground">End</dt>
          <dd>{cycleEnd(cycle) ? format(cycleEnd(cycle)!, 'd MMM yyyy') : '—'}</dd>
          <dt className="text-muted-foreground">Status</dt>
          <dd className="capitalize">{cycle.status}</dd>
          <dt className="text-muted-foreground">Planted</dt>
          <dd>{cycle.plantingDate ? format(cycle.plantingDate, 'd MMM yyyy') : '—'}</dd>
          <dt className="text-muted-foreground">Harvest</dt>
          <dd>
            {cycle.actualHarvest
              ? format(cycle.actualHarvest, 'd MMM yyyy')
              : cycle.expectedHarvest
                ? `Expected ${format(cycle.expectedHarvest, 'd MMM yyyy')}`
                : '—'}
          </dd>
        </dl>
      </Card>
      <CycleWorkspace
        title={`${cycle.crop.name} · ${cyclePeriod(cycle)}`}
        hint={`This planting on ${cycle.plot.name}. Money here is this cycle only, not the whole plot.`}
        backHref={`${base}/cycles`}
        backLabel="All cycles"
        money={money}
        activities={activityLines(cycle.activities)}
        expenses={expenseLines(cycle.expenses)}
        sales={saleLines(cycle.sales)}
        labour={labourLines(cycle.labour)}
        harvests={harvestLines(cycle.harvests)}
        irrigations={irrigationLines(cycle.irrigations)}
      />
    </div>
  )
}
