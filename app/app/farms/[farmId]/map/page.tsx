import Link from 'next/link'
import { requireFarm } from '@/lib/access'
import { prisma } from '@/lib/prisma'
import { plotFinance } from '@/lib/services/finance'
import { farmCenter } from '@/lib/geo'
import { Card, CardHint, CardTitle } from '@/components/ui/card'
import { DrawPlotLazy } from '@/components/DrawPlotLazy'
import { PageHeader } from '@/components/PageHeader'
import { acres as fmtAcres, inr } from '@/lib/utils'
import { PlotActions } from '@/components/PlotActions'
import { FarmRename } from '@/components/FarmRename'

function nextPlotCode(codes: string[]) {
  const nums = codes.map((c) => Number(c.replace(/\D/g, ''))).filter((n) => Number.isFinite(n) && n > 0)
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return String(next).padStart(2, '0')
}

export default async function FarmMapPage({
  params,
  searchParams,
}: {
  params: Promise<{ farmId: string }>
  searchParams: Promise<{ plot?: string }>
}) {
  const { farmId } = await params
  const { plot: editPlotId } = await searchParams
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
        title={
          <span className="inline-flex items-center gap-2">
            {farm.name} map
            <FarmRename farmId={farmId} name={farm.name} />
          </span>
        }
        hint="Draw a new plot, click a saved plot to edit it, or delete one you no longer need."
      />
      <DrawPlotLazy
        farmId={farmId}
        center={center}
        crops={crops}
        nextCode={nextPlotCode(plots.map((p) => p.code))}
        editPlotId={editPlotId}
        plots={plots.map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          geoJson: p.geoJson,
          irrigation: p.irrigation,
          soilType: p.soilType,
          status: p.status,
        }))}
        farm={{ geoJson: farm.geoJson, lat: farm.lat, lng: farm.lng }}
      />
      {cards.length ? (
        <div>
          <CardHint>{cards.length} saved</CardHint>
          <CardTitle className="mb-3">Plots on this farm</CardTitle>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map(({ p, m }) => (
              <Card key={p.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link href={`/app/farms/${farmId}/plots/${p.id}`} className="font-medium text-primary">
                      {p.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Plot {p.code} · {fmtAcres(p.acres)} · {p.status}
                    </p>
                  </div>
                  <PlotActions farmId={farmId} plotId={p.id} plotName={p.name} compact />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-[#fff1f2] p-2">
                    <p className="text-muted-foreground">Out</p>
                    <p className="num mt-0.5 font-semibold">{inr(m.expenses)}</p>
                  </div>
                  <div className="rounded-lg bg-[#f0fdf4] p-2">
                    <p className="text-muted-foreground">In</p>
                    <p className="num mt-0.5 font-semibold">{inr(m.revenue)}</p>
                  </div>
                  <div className="rounded-lg bg-[#eef2ff] p-2">
                    <p className="text-muted-foreground">P/L</p>
                    <p className="num mt-0.5 font-semibold">{inr(m.profit)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
