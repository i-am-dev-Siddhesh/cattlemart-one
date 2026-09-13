'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { createCropAction } from '@/lib/actions'
import { CropFormFields } from '@/components/CropFormFields'
import { useFeedback } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

export type CropOption = { id: string; name: string }

export function CropPicker({
  farmId,
  name = 'cropId',
  crops,
  defaultValue,
  allowEmpty,
  emptyLabel = 'Leave unplanted',
}: {
  farmId: string
  name?: string
  crops: CropOption[]
  defaultValue?: string
  allowEmpty?: boolean
  emptyLabel?: string
}) {
  const router = useRouter()
  const { run } = useFeedback()
  const [list, setList] = useState(crops)
  const [value, setValue] = useState(defaultValue ?? (allowEmpty ? '' : (crops[0]?.id ?? '')))
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()

  useEffect(() => {
    setList(crops)
  }, [crops])

  return (
    <div className="space-y-2">
      <Select name={name} value={value} onChange={(e) => setValue(e.target.value)} required={!allowEmpty}>
        {allowEmpty ? <option value="">{emptyLabel}</option> : null}
        {list.map((crop) => (
          <option key={crop.id} value={crop.id}>
            {crop.name}
          </option>
        ))}
      </Select>
      <button
        type="button"
        className="inline-flex items-center gap-1 text-sm font-medium text-primary"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-3.5 w-3.5" />
        Add a crop
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>New crop</DialogTitle>
          <DialogDescription>Saved to this farm. You can plant it on any plot.</DialogDescription>
          <form
            className="mt-4 grid gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              start(async () => {
                const res = await run(
                  () =>
                    createCropAction({
                      farmId,
                      name: String(fd.get('name') ?? ''),
                      localName: String(fd.get('localName') ?? ''),
                      scientificName: String(fd.get('scientificName') ?? ''),
                    }),
                  { ok: 'Crop added' },
                )
                if (!res.ok) return
                setList((rows) => [...rows, { id: res.data.id, name: res.data.name }].sort((a, b) => a.name.localeCompare(b.name)))
                setValue(res.data.id)
                setOpen(false)
                router.refresh()
              })
            }}
          >
            <CropFormFields />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button disabled={pending}>{pending ? 'Saving…' : 'Save crop'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function CropPickerField(props: Parameters<typeof CropPicker>[0] & { label?: string }) {
  return (
    <div>
      {props.label ? <Label>{props.label}</Label> : null}
      <CropPicker {...props} />
    </div>
  )
}
