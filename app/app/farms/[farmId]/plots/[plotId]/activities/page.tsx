import { PlotRecords } from '@/lib/plot-tab'

export default async function Page({ params }: { params: Promise<{ farmId: string; plotId: string }> }) {
  const { farmId, plotId } = await params
  return <PlotRecords farmId={farmId} plotId={plotId} tab="activities" />
}
