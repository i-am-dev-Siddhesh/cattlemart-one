import { requirePlot } from '@/lib/access'
import { plotYearDetail } from '@/lib/cycle-views'
import { activityLines, expenseLines, harvestLines, irrigationLines, labourLines, saleLines } from '@/lib/cycle-rows'
import { CycleWorkspace } from '@/components/CycleWorkspace'
import { EmptyState } from '@/components/ui/empty'
import { cyclePeriod } from '@/lib/cycle-span'

export default async function PlotYearPage({
  params,
}: {
  params: Promise<{ farmId: string; plotId: string; year: string }>
}) {
  const { farmId, plotId, year: yearRaw } = await params
  await requirePlot(farmId, plotId)
  const year = Number(yearRaw)
  if (!Number.isFinite(year)) return <EmptyState title="Unknown year" body="Open a year from the plot cycles list." />
  const data = await plotYearDetail(farmId, plotId, year)
  const base = `/app/farms/${farmId}/plots/${plotId}`
  if (!data.cycles.length) {
    return <EmptyState title={`No cycles in ${year}`} body="Planted years appear here after a crop cycle is created." />
  }
  return (
    <CycleWorkspace
      title={`${year} on this plot`}
      hint="Roll-up of every crop cycle planted this year. Open a cycle for one crop’s ledger."
      backHref={`${base}/cycles`}
      backLabel="All cycles"
      money={data.money}
      cycles={data.cycles.map(({ cycle, money }) => ({
        id: cycle.id,
        href: `${base}/cycles/${cycle.id}`,
        crop: cycle.crop.name,
        season: cyclePeriod(cycle),
        status: cycle.status,
        expenses: money.expenses,
        revenue: money.revenue,
        profit: money.profit,
      }))}
      activities={activityLines(data.activities)}
      expenses={expenseLines(data.expenses)}
      sales={saleLines(data.sales)}
      labour={labourLines(data.labour)}
      harvests={harvestLines(data.harvests)}
      irrigations={irrigationLines(data.irrigations)}
    />
  )
}
