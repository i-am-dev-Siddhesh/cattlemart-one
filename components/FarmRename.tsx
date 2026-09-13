'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil } from 'lucide-react'
import { updateFarmNameAction } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useFeedback } from '@/components/feedback'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'

export function FarmRename({
  farmId,
  name,
}: {
  farmId: string
  name: string
}) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(name)
  const [pending, start] = useTransition()
  const { run } = useFeedback()
  const router = useRouter()

  function save() {
    start(async () => {
      const res = await run(() => updateFarmNameAction({ farmId, name: value }), { ok: 'Farm renamed' })
      if (!res.ok) return
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-8 w-8"
        aria-label="Rename farm"
        onClick={() => {
          setValue(name)
          setOpen(true)
        }}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (next) setValue(name)
        }}
      >
        <DialogContent>
          <DialogTitle>Rename farm</DialogTitle>
          <DialogDescription>This name shows in the sidebar, map, and farm list.</DialogDescription>
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              save()
            }}
          >
            <Field label="Farm name">
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoFocus
                required
                placeholder="Farm name"
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !value.trim()}>
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  'Save name'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
