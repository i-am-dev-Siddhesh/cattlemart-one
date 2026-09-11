import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/PageHeader'

export default function CategoriesPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Expense categories" />
      <Card>
        <p className="text-sm text-muted-foreground">
          seeds, fertilizer, pesticides, herbicides, fungicides, labour, machinery, fuel, irrigation, electricity, water,
          transport, repairs, packaging, storage, land lease, other
        </p>
      </Card>
    </div>
  )
}
