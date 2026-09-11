import Link from 'next/link'
import { currentFarm } from '@/lib/context'
import { createFarmAction } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/PageHeader'

export default async function FarmsPage() {
  const ctx = await currentFarm()
  const farms = ctx?.farms ?? []
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
              <Link href={`/app/farms/${f.id}`} className="mt-3 inline-block text-sm font-medium text-primary">
                Open farm
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No farms" body="Add the first farm for this organization." />
      )}
      <Card>
        <h2 className="text-base font-semibold">Add farm</h2>
        <form
          action={async (fd) => {
            'use server'
            await createFarmAction({
              name: String(fd.get('name')),
              village: String(fd.get('village') ?? ''),
              season: String(fd.get('season') ?? ''),
            })
          }}
          className="mt-4 grid gap-4 sm:grid-cols-3"
        >
          <Field label="Name">
            <Input name="name" required placeholder="Green Valley Farm" />
          </Field>
          <Field label="Village">
            <Input name="village" placeholder="Village" />
          </Field>
          <Field label="Season">
            <Input name="season" placeholder="Kharif 2026" />
          </Field>
          <div className="sm:col-span-3">
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
