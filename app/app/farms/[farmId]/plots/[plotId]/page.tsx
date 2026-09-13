import Link from 'next/link'
import { format } from 'date-fns'
import { plotDetail } from '@/lib/queries'
import { groupCyclesByYear, plotCyclesWithMoney } from '@/lib/cycle-views'
import { expenseBreakdown } from '@/lib/services/finance'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty'
import { Table, Td, Th } from '@/components/ui/table'
import { PlotMapLazy } from '@/components/PlotMapLazy'
import { acres, inr } from '@/lib/utils'
import { cyclePeriod } from '@/lib/cycle-span'
import { farmCenter, farmWorkingRing } from '@/lib/geo'

export default async function PlotOverview({
  params,
}: {
  params: Promise<{ farmId: string; plotId: string }>
}) {
  const { farmId, plotId } = await params
  const { plot, current, money, cycleMoney } = await plotDetail(farmId, plotId)
  const breakdown = await expenseBreakdown(plotId)
  const cycleRows = await plotCyclesWithMoney(farmId, plotId)
  const years = groupCyclesByYear(cycleRows)
  const base = `/app/farms/${farmId}/plots/${plotId}`
  const costAcre = plot.acres ? money.expenses / plot.acres : 0
  const revAcre = plot.acres ? money.revenue / plot.acres : 0
  const profitAcre = plot.acres ? money.profit / plot.acres : 0
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Current crop</h2>
          {current ? (
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Crop</dt>
              <dd>{current.crop.name}</dd>
              <dt className="text-muted-foreground">Variety</dt>
              <dd>{current.variety?.name ?? '—'}</dd>
              <dt className="text-muted-foreground">Period</dt>
              <dd>{cyclePeriod(current)}</dd>
              <dt className="text-muted-foreground">Planted</dt>
              <dd>{current.plantingDate ? format(current.plantingDate, 'd MMM yyyy') : '—'}</dd>
              <dt className="text-muted-foreground">Expected harvest</dt>
              <dd>{current.expectedHarvest ? format(current.expectedHarvest, 'd MMM yyyy') : '—'}</dd>
              <dt className="text-muted-foreground">Stage</dt>
              <dd>{current.status}</dd>
            </dl>
          ) : (
            <EmptyState title="No current cycle" body="History stays on this plot. Plant a new cycle when ready." />
          )}
        </Card>
        <Card>
          <h2 className="font-semibold">Financial performance</h2>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Total cost</dt>
            <dd>{inr(money.expenses)}</dd>
            <dt className="text-muted-foreground">Revenue</dt>
            <dd>{inr(money.revenue)}</dd>
            <dt className="text-muted-foreground">Profit</dt>
            <dd>{inr(money.profit)}</dd>
            <dt className="text-muted-foreground">ROI</dt>
            <dd>{money.roi != null ? `${money.roi.toFixed(1)}%` : '—'}</dd>
            <dt className="text-muted-foreground">Cost / acre</dt>
            <dd>{inr(costAcre)}</dd>
            <dt className="text-muted-foreground">Revenue / acre</dt>
            <dd>{inr(revAcre)}</dd>
            <dt className="text-muted-foreground">Profit / acre</dt>
            <dd>{inr(profitAcre)}</dd>
          </dl>
          {cycleMoney ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Current cycle only: {inr(cycleMoney.expenses)} / {inr(cycleMoney.revenue)}
              {current ? (
                <>
                  {' · '}
                  <Link href={`${base}/cycles/${current.id}`} className="text-primary">
                    Open cycle
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}
        </Card>
      </div>
      {years.length ? (
        <Card>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-semibold">Year and crop cycle</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Figures above are the whole plot. Open a year or cycle for that season only.
              </p>
            </div>
            <Link href={`${base}/cycles`} className="text-sm font-medium text-primary">
              All cycles
            </Link>
          </div>
          <Table className="mt-4">
            <thead>
              <tr>
                <Th>Year</Th>
                <Th>Crops</Th>
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
                  <Td>
                    {y.items.map((i, idx) => (
                      <span key={i.cycle.id}>
                        {idx ? ', ' : ''}
                        <Link href={`${base}/cycles/${i.cycle.id}`} className="text-primary">
                          {i.cycle.crop.name}
                        </Link>
                      </span>
                    ))}
                  </Td>
                  <Td className="num text-right">{inr(y.money.expenses)}</Td>
                  <Td className="num text-right">{inr(y.money.revenue)}</Td>
                  <Td className="num text-right">{inr(y.money.profit)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : null}
      <div className="map-frame relative isolate z-0 h-[min(56vh,360px)] overflow-hidden rounded-xl border border-border">
        <PlotMapLazy
          plots={[plot]}
          center={farmCenter(plot.farm, [plot])}
          selectedId={plot.id}
          farmRing={farmWorkingRing(plot.farm, [plot])}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Recent activity</h2>
          {plot.activities.length ? (
            <ol className="mt-3 space-y-2 text-sm">
              {plot.activities.slice(0, 12).map((a) => (
                <li key={a.id}>
                  <span className="text-muted-foreground">{format(a.date, 'd MMM')}</span> · {a.type}
                  {a.description ? ` · ${a.description}` : ''}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No activities recorded.</p>
          )}
        </Card>
        <Card>
          <h2 className="font-semibold">Expense breakdown</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {breakdown.map((b) => (
              <li key={b.category} className="flex justify-between capitalize">
                <span>{b.category}</span>
                <span>{inr(b.amount)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="font-semibold">Crop health</h2>
          <p className="mt-2 text-sm">Pests {plot.pests.length} · Diseases {plot.diseases.length} · Notes {plot.observations.length}</p>
          <ul className="mt-2 text-sm text-muted-foreground">
            {plot.diseases.slice(0, 3).map((d) => (
              <li key={d.id}>{d.disease} ({d.severity})</li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="font-semibold">Upcoming</h2>
          <ul className="mt-2 text-sm">
            {plot.tasks.filter((t) => t.status !== 'completed').map((t) => (
              <li key={t.id}>{t.title}</li>
            ))}
            {current?.expectedHarvest ? <li>Harvest {format(current.expectedHarvest, 'd MMM yyyy')}</li> : null}
          </ul>
        </Card>
      </div>
    </div>
  )
}
