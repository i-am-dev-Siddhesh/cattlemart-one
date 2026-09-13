import { requirePlot } from '@/lib/access'
import { plotDetail } from '@/lib/queries'
import { Metric, StatusBadge } from '@/components/ui/empty'
import { PlotTabs } from '@/components/PlotTabs'
import { PlotActions } from '@/components/PlotActions'
import { acres, inr } from '@/lib/utils'
import { cyclePeriod } from '@/lib/cycle-span'
import { differenceInCalendarDays } from 'date-fns'

export default async function PlotLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ farmId: string; plotId: string }>
}) {
  const { farmId, plotId } = await params
  await requirePlot(farmId, plotId)
  const { plot, current, money } = await plotDetail(farmId, plotId)
  const planted = current?.plantingDate
  const dap = planted ? differenceInCalendarDays(new Date(), planted) : null
  const base = `/app/farms/${farmId}/plots/${plotId}`
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">
            {plot.farm.name} / Plots / {plot.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{plot.name}</h1>
          <p className="text-sm text-muted-foreground">
            {acres(plot.acres)} · {current ? `${current.crop.name} · ${cyclePeriod(current)}` : 'Unplanted'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={plot.status} />
          <PlotActions farmId={farmId} plotId={plotId} plotName={plot.name} after="plots" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Area" value={acres(plot.acres)} />
        <Metric label="Current crop" value={current?.crop.name ?? '—'} />
        <Metric label="Crop stage" value={current?.status ?? '—'} />
        <Metric label="Days since planting" value={dap != null ? `${dap} d` : '—'} />
        <Metric label="Total expenses" value={inr(money.expenses)} hint="Actual" />
        <Metric label="Revenue" value={inr(money.revenue)} hint="Actual" />
        <Metric label="Estimated profit" value={inr(money.profit)} hint="Revenue − expenses" />
        <Metric label="Yield recorded" value={money.yieldQty ? String(money.yieldQty) : '—'} />
      </div>
      <p className="num text-sm text-muted-foreground">
        {inr(money.expenses)} spent · {inr(money.revenue)} revenue · {inr(money.profit)} profit
      </p>
      <PlotTabs base={base} />
      {children}
    </div>
  )
}
