import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/PageHeader'

export default function IntegrationsPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Integrations" />
      <Card>
        <p className="text-sm text-muted-foreground">
          Mapbox and object storage are optional. Weather uses Open-Meteo with the farm boundary centre (or plot outlines /
          map pin). No weather key is required. This workspace uses OpenStreetMap and local SQLite so the farm book can
          run without paid map services.
        </p>
      </Card>
    </div>
  )
}
