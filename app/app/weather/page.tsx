import Link from 'next/link'
import { currentFarm } from '@/lib/context'
import { loadWeatherAdvisory } from '@/lib/services/weather-context'
import { WeatherAdvisoryView } from '@/components/WeatherAdvisory'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty'

export const dynamic = 'force-dynamic'

export default async function WeatherPage() {
  const ctx = await currentFarm()
  if (!ctx?.farm) {
    return (
      <EmptyState
        title="Select a farm"
        body="Create or choose a farm first."
        action={
          <Button asChild>
            <Link href="/app/farms">Farms</Link>
          </Button>
        }
      />
    )
  }

  const data = await loadWeatherAdvisory(ctx.farm.id)
  return (
    <div className="space-y-4">
      <PageHeader
        title="Weather"
        hint="Forecast for your farm boundary. Advice uses only this forecast plus the crop and field records already in Cattlemart One."
        action={
          <Button asChild variant="outline">
            <Link href="/app/map">Farm map</Link>
          </Button>
        }
      />
      <WeatherAdvisoryView data={data} />
    </div>
  )
}
