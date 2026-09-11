import { currentFarm } from '@/lib/context'
import { EmptyState } from '@/components/ui/empty'
import { ReportsClient } from '@/components/ReportsClient'
import { PageHeader } from '@/components/PageHeader'

export default async function ReportsPage() {
  const ctx = await currentFarm()
  if (!ctx?.farm) return <EmptyState title="No farm" body="Select a farm." />
  return (
    <div className="space-y-4">
      <PageHeader title="Reports" hint="Exports only include stored records." />
      <ReportsClient farmId={ctx.farm.id} />
    </div>
  )
}
