'use client'

import { useState, useTransition } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { createCropAction, deleteCropAction, updateCropAction } from '@/lib/actions'
import { CropFormFields } from '@/components/CropFormFields'
import { useFeedback } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty'
import { Table, Td, Th } from '@/components/ui/table'

export type CatalogCrop = {
  id: string
  name: string
  localName: string | null
  scientificName: string | null
  cycleCount: number
}

export function CropCatalog({ farmId, crops }: { farmId: string; crops: CatalogCrop[] }) {
  const { run } = useFeedback()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CatalogCrop | null>(null)
  const [removing, setRemoving] = useState<CatalogCrop | null>(null)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Crop types</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Add the crops you grow. Planting a cycle still uses this list.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          Add crop
        </Button>
      </div>

      {crops.length ? (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Local</Th>
              <Th>Scientific</Th>
              <Th className="text-right">Cycles</Th>
              <Th className="w-[1%] text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {crops.map((crop) => (
              <tr key={crop.id}>
                <Td className="font-medium">{crop.name}</Td>
                <Td>{crop.localName || '—'}</Td>
                <Td>{crop.scientificName || '—'}</Td>
                <Td className="num text-right">{crop.cycleCount}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(crop)
                        setOpen(true)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setRemoving(crop)}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState title="No crops yet" body="Add rice, wheat, or anything you grow. Then plant a cycle on a plot." />
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setEditing(null)
        }}
      >
        <DialogContent>
          <DialogTitle>{editing ? 'Edit crop' : 'Add crop'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Renames this crop everywhere it is planted.' : 'This only adds a crop type. It does not plant a plot.'}
          </DialogDescription>
          <form
            key={editing?.id ?? 'new'}
            className="mt-4 grid gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              const payload = {
                farmId,
                name: String(fd.get('name') ?? ''),
                localName: String(fd.get('localName') ?? ''),
                scientificName: String(fd.get('scientificName') ?? ''),
              }
              start(async () => {
                const res = await run(
                  () =>
                    (editing
                      ? updateCropAction({ ...payload, cropId: editing.id })
                      : createCropAction(payload)
                    ).then(() => undefined),
                  { ok: editing ? 'Crop updated' : 'Crop added' },
                )
                if (res.ok) {
                  setOpen(false)
                  setEditing(null)
                }
              })
            }}
          >
            <CropFormFields
              name={editing?.name}
              localName={editing?.localName}
              scientificName={editing?.scientificName}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button disabled={pending}>{pending ? 'Saving…' : 'Save crop'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(removing)} onOpenChange={(next) => !next && setRemoving(null)}>
        <DialogContent>
          <DialogTitle>Delete {removing?.name}?</DialogTitle>
          <DialogDescription>
            {removing?.cycleCount
              ? `This crop is used on ${removing.cycleCount} cycle${removing.cycleCount === 1 ? '' : 's'} and cannot be deleted.`
              : 'This removes the crop type from the farm list.'}
          </DialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              disabled={pending || Boolean(removing?.cycleCount)}
              onClick={() => {
                if (!removing) return
                start(async () => {
                  const res = await run(() => deleteCropAction({ farmId, cropId: removing.id }), { ok: 'Crop deleted' })
                  if (res.ok) setRemoving(null)
                })
              }}
            >
              {pending ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
