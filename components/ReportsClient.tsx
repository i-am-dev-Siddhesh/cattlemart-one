'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function ReportsClient({ farmId }: { farmId: string }) {
  return (
    <Card className="flex flex-wrap gap-2">
      {['expenses', 'harvests', 'plots'].map((kind) => (
        <Button key={kind} variant="outline" asChild>
          <a href={`/api/export?farmId=${farmId}&kind=${kind}`}>Download {kind} CSV</a>
        </Button>
      ))}
    </Card>
  )
}
