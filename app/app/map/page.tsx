import { redirect } from 'next/navigation'
import { currentFarm } from '@/lib/context'
import { EmptyState } from '@/components/ui/empty'

export default async function MapAlias() {
  const ctx = await currentFarm()
  if (!ctx?.farm) return <EmptyState title="No farm" body="Create a farm to open the map." />
  redirect(`/app/farms/${ctx.farm.id}/map`)
}
