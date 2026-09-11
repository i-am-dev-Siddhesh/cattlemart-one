import { currentFarm } from '@/lib/context'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty'
import { PageHeader } from '@/components/PageHeader'

export default async function SettingsPage() {
  const ctx = await currentFarm()
  if (!ctx?.farm) return <EmptyState title="No farm" body="Create a farm first." />
  const f = ctx.farm
  return (
    <div className="space-y-4">
      <PageHeader title="Farm settings" />
      <Card>
        <p className="font-semibold">{f.name}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Season {f.season} · {f.currency} · area unit {f.areaUnit}
        </p>
        {f.notes ? <p className="mt-2 text-sm text-muted-foreground">{f.notes}</p> : null}
      </Card>
    </div>
  )
}
