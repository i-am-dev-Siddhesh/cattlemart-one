import { currentFarm } from '@/lib/context'
import { createFarmAction } from '@/lib/actions'
import { openFarmAction } from '@/lib/farm-cookie'
import { ActionForm, SubmitButton } from '@/components/feedback'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/PageHeader'
import { Select } from '@/components/ui/select'
import { WEATHER_SEASONS, farmSeasonLine, isoDay, seasonWindow } from '@/lib/farm-season'

export default async function FarmsPage() {
  const ctx = await currentFarm()
  const farms = ctx?.farms ?? []
  const kharif = seasonWindow('Kharif')
  return (
    <div className="space-y-5">
      <PageHeader title="Farms" hint="Each farm has its own plots and ledger." />
      {farms.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {farms.map((f) => (
            <Card key={f.id}>
              <p className="text-xs text-muted-foreground">Farm</p>
              <h2 className="mt-1 text-lg font-semibold">{f.name}</h2>
              <p className="text-sm text-muted-foreground">{[f.village, f.district, f.state].filter(Boolean).join(', ')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{farmSeasonLine(f)}</p>
              <ActionForm
                action={async () => {
                  'use server'
                  await openFarmAction(f.id)
                }}
                className="mt-3"
              >
                <SubmitButton variant="ghost" className="h-auto px-0 text-sm font-medium text-primary" pendingLabel="Opening…">
                  Open farm
                </SubmitButton>
              </ActionForm>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No farms" body="Add the first farm for this organization." />
      )}
      <Card>
        <h2 className="text-base font-semibold">Add farm</h2>
        <p className="mt-1 text-sm text-muted-foreground">Weather season plus the dates this farm book covers.</p>
        <ActionForm
          ok="Farm created"
          action={async (fd) => {
            'use server'
            await createFarmAction({
              name: String(fd.get('name')),
              village: String(fd.get('village') ?? ''),
              season: String(fd.get('season') ?? ''),
              startDate: String(fd.get('startDate') ?? ''),
              endDate: String(fd.get('endDate') ?? ''),
            })
          }}
          className="mt-4 grid gap-4 sm:grid-cols-2"
        >
          <Field label="Name">
            <Input name="name" required placeholder="Green Valley Farm" />
          </Field>
          <Field label="Village">
            <Input name="village" placeholder="Village" />
          </Field>
          <Field label="Weather season">
            <Select name="season" defaultValue="Kharif">
              {WEATHER_SEASONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <div className="hidden sm:block" />
          <Field label="Start date">
            <Input name="startDate" type="date" required defaultValue={isoDay(kharif.start)} />
          </Field>
          <Field label="End date">
            <Input name="endDate" type="date" required defaultValue={isoDay(kharif.end)} />
          </Field>
          <div className="sm:col-span-2">
            <SubmitButton pendingLabel="Creating…">Create</SubmitButton>
          </div>
        </ActionForm>
      </Card>
    </div>
  )
}
