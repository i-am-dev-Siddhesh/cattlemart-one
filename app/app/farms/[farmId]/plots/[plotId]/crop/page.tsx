import Link from 'next/link'
import { plotDetail } from '@/lib/queries'
import { plantNewCycleAction } from '@/lib/actions'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { format } from 'date-fns'
import { cyclePeriod } from '@/lib/cycle-span'

export default async function PlotCrop({ params }: { params: Promise<{ farmId: string; plotId: string }> }) {
  const { farmId, plotId } = await params
  const { current } = await plotDetail(farmId, plotId)
  const crops = await prisma.crop.findMany({ where: { farmId } })
  const c = current
  const startDefault = new Date().toISOString().slice(0, 10)
  const endDefault = new Date()
  endDefault.setMonth(endDefault.getMonth() + 4)
  const endDefaultStr = endDefault.toISOString().slice(0, 10)
  return (
    <div className="space-y-4">
      {c ? (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Crop identity</h2>
            <Link href={`/app/farms/${farmId}/plots/${plotId}/cycles/${c.id}`} className="text-sm font-medium text-primary">
              Open this cycle
            </Link>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Name</dt>
            <dd>{c.crop.name}</dd>
            <dt className="text-muted-foreground">Local</dt>
            <dd>{c.crop.localName ?? '—'}</dd>
            <dt className="text-muted-foreground">Scientific</dt>
            <dd>{c.crop.scientificName ?? '—'}</dd>
            <dt className="text-muted-foreground">Variety</dt>
            <dd>{c.variety?.name ?? '—'}</dd>
            <dt className="text-muted-foreground">Seed source</dt>
            <dd>{c.seedSource ?? '—'}</dd>
            <dt className="text-muted-foreground">Supplier</dt>
            <dd>{c.seedSupplier ?? '—'}</dd>
            <dt className="text-muted-foreground">Lot</dt>
            <dd>{c.seedLot ?? '—'}</dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd>{c.status}</dd>
            <dt className="text-muted-foreground">Cycle</dt>
            <dd>{cyclePeriod(c)}</dd>
            <dt className="text-muted-foreground">Start</dt>
            <dd>{c.startDate || c.plantingDate ? format(c.startDate ?? c.plantingDate!, 'd MMM yyyy') : '—'}</dd>
            <dt className="text-muted-foreground">End</dt>
            <dd>{c.endDate || c.expectedHarvest ? format(c.endDate ?? c.expectedHarvest!, 'd MMM yyyy') : '—'}</dd>
            <dt className="text-muted-foreground">Planted</dt>
            <dd>{c.plantingDate ? format(c.plantingDate, 'd MMM yyyy') : '—'}</dd>
            <dt className="text-muted-foreground">Transplant</dt>
            <dd>{c.transplantingDate ? format(c.transplantingDate, 'd MMM yyyy') : '—'}</dd>
            <dt className="text-muted-foreground">Method</dt>
            <dd>{c.plantingMethod ?? '—'}</dd>
            <dt className="text-muted-foreground">Water</dt>
            <dd>{c.irrigationMethod ?? '—'}</dd>
          </dl>
        </Card>
      ) : (
        <EmptyState title="No active crop" body="The plot stays. Start a new cycle without overwriting history." />
      )}
      <Card>
        <h2 className="text-base font-semibold">Plant a new cycle</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set start and end dates. Length is stored in months. Open cycles are marked completed. History is never deleted.
        </p>
        <form
          action={async (fd) => {
            'use server'
            await plantNewCycleAction({
              farmId,
              plotId,
              cropId: String(fd.get('cropId')),
              startDate: String(fd.get('startDate')),
              endDate: String(fd.get('endDate')),
            })
          }}
          className="mt-4 grid gap-4 sm:grid-cols-3"
        >
          <Field label="Crop">
            <Select name="cropId" required>
              {crops.map((crop) => (
                <option key={crop.id} value={crop.id}>
                  {crop.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Start date" hint="Planting / cycle start">
            <Input name="startDate" type="date" required defaultValue={startDefault} />
          </Field>
          <Field label="End date" hint="Expected harvest / cycle end">
            <Input name="endDate" type="date" required defaultValue={endDefaultStr} />
          </Field>
          <div className="sm:col-span-3">
            <Button type="submit">Create crop cycle</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
