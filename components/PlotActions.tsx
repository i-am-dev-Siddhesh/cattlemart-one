'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Pencil, Trash2 } from 'lucide-react'
import { deletePlotAction } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useFeedback } from '@/components/feedback'
import { Loader2 } from 'lucide-react'

export function PlotActions({
  farmId,
  plotId,
  plotName,
  after = 'map',
  compact = false,
}: {
  farmId: string
  plotId: string
  plotName: string
  after?: 'map' | 'plots' | 'farm'
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const { run } = useFeedback()
  const router = useRouter()
  const mapHref = `/app/farms/${farmId}/map?plot=${plotId}` as const
  const afterHref =
    after === 'plots'
      ? (`/app/farms/${farmId}/plots` as const)
      : after === 'farm'
        ? (`/app/farms/${farmId}` as const)
        : (`/app/farms/${farmId}/map` as const)

  function remove() {
    setError('')
    start(async () => {
      try {
        const res = await run(() => deletePlotAction({ farmId, plotId }), { ok: `${plotName} deleted` })
        if (!res.ok) return
        setOpen(false)
        router.push(afterHref)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not delete this plot.')
      }
    })
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button asChild size="sm" variant="outline">
          <Link href={mapHref}>
            <Pencil className="h-3.5 w-3.5" />
            {compact ? 'Edit' : 'Edit on map'}
          </Link>
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Delete {plotName}?</DialogTitle>
          <DialogDescription>
            This removes the plot and its crop history. Money already logged stays on the farm, not on this plot.
          </DialogDescription>
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Keep plot
            </Button>
            <Button type="button" variant="destructive" disabled={pending} onClick={remove}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Deleting…
                </>
              ) : (
                'Delete plot'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
