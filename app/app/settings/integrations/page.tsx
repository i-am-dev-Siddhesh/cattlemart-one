import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/PageHeader'

export default function IntegrationsPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Integrations" />
      <Card>
        <p className="text-sm text-muted-foreground">
          Mapbox, weather, and object storage are optional. This workspace uses OpenStreetMap and local SQLite so the
          farm book runs without those services.
        </p>
      </Card>
    </div>
  )
}
