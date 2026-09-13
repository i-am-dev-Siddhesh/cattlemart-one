import { currentFarm } from '@/lib/context'
import { updateFarmNameAction, updateFarmSeasonAction } from '@/lib/actions'
import { ActionForm, SubmitButton } from '@/components/feedback'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/PageHeader'
import { Select } from '@/components/ui/select'
import { WEATHER_SEASONS, farmSeasonLine, isoDay, seasonWindow, weatherSeason } from '@/lib/farm-season'

export default async function SettingsPage() {
  const ctx = await currentFarm()
  if (!ctx?.farm) return <EmptyState title="No farm" body="Create a farm first." />
  const f = ctx.farm
  const fallback = seasonWindow(f.season, f.year)
  const start = f.startDate ?? fallback.start
  const end = f.endDate ?? fallback.end
  return (
    <div className="space-y-4">
      <PageHeader title="Farm settings" />
      <Card>
        <p className="font-semibold">{f.name}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {farmSeasonLine(f)} · {f.currency} · area unit {f.areaUnit}
        </p>
        {f.notes ? <p className="mt-2 text-sm text-muted-foreground">{f.notes}</p> : null}
        <ActionForm
          ok="Farm renamed"
          action={async (fd) => {
            'use server'
            await updateFarmNameAction({ farmId: f.id, name: String(fd.get('name') ?? '') })
          }}
          className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"
        >
          <Field label="Farm name">
            <Input name="name" required defaultValue={f.name} />
          </Field>
          <SubmitButton>Save name</SubmitButton>
        </ActionForm>
      </Card>
      <Card>
        <h2 className="text-base font-semibold">Season dates</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Weather season is Kharif, Rabi, or Zaid. Dates are the window this farm book uses.
        </p>
        <ActionForm
          ok="Season dates saved"
          action={async (fd) => {
            'use server'
            await updateFarmSeasonAction({
              farmId: f.id,
              season: String(fd.get('season')),
              startDate: String(fd.get('startDate')),
              endDate: String(fd.get('endDate')),
            })
          }}
          className="mt-4 grid gap-4 sm:grid-cols-3"
        >
          <Field label="Weather season">
            <Select name="season" defaultValue={weatherSeason(f.season)}>
              {WEATHER_SEASONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Start date">
            <Input name="startDate" type="date" required defaultValue={isoDay(start)} />
          </Field>
          <Field label="End date">
            <Input name="endDate" type="date" required defaultValue={isoDay(end)} />
          </Field>
          <div className="sm:col-span-3">
            <SubmitButton>Save season</SubmitButton>
          </div>
        </ActionForm>
      </Card>
    </div>
  )
}
