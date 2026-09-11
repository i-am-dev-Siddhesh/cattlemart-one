import { currentFarm } from '@/lib/context'
import { EmptyState } from '@/components/ui/empty'
import { AssistantClient } from '@/components/AssistantClient'
import { PageHeader } from '@/components/PageHeader'

export default async function AssistantPage() {
  const ctx = await currentFarm()
  if (!ctx?.farm) return <EmptyState title="No farm" body="Choose a farm first." />
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Assistant" hint="Answers come from this farm’s database only." />
      <AssistantClient farmId={ctx.farm.id} />
    </div>
  )
}
