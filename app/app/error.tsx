'use client'

import { Card } from '@/components/ui/card'

export default function AppError({ error }: { error: Error }) {
  return (
    <Card>
      <h1 className="text-lg font-semibold">Could not load this page</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error?.message || 'Try again from the dashboard.'}</p>
    </Card>
  )
}
