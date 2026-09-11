import { redirect } from 'next/navigation'

export default async function HistoryAlias({
  params,
}: {
  params: Promise<{ farmId: string; plotId: string }>
}) {
  const { farmId, plotId } = await params
  redirect(`/app/farms/${farmId}/plots/${plotId}/cycles`)
}
