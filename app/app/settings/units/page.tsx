import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/PageHeader'

export default function UnitsPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Units" />
      <Card>
        <p className="text-sm text-muted-foreground">
          Default display is acres and INR. Stored quantities keep their own units.
        </p>
      </Card>
    </div>
  )
}
