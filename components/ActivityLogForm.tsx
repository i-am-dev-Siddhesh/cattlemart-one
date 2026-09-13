'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { useFeedback } from '@/components/feedback'
import { createExpenseAction, createObservationAction, createSaleAction } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function logKind(value?: string) {
  if (value === 'sale' || value === 'health') return value
  return 'expense'
}

export function ActivityLogForm({
  open,
  onOpenChange,
  farmId,
  plots,
  crops = [],
  defaultPlotId,
  defaultKind = 'expense',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  farmId: string
  plots: { id: string; name: string; cropId?: string }[]
  crops?: { id: string; name: string }[]
  defaultPlotId?: string
  defaultKind?: string
}) {
  const [kind, setKind] = useState(logKind(defaultKind))
  const [pending, start] = useTransition()
  const { run } = useFeedback()
  const [qty, setQty] = useState(0)
  const [rate, setRate] = useState(0)
  const [plotId, setPlotId] = useState(defaultPlotId ?? plots[0]?.id ?? '')
  const today = new Date().toISOString().slice(0, 10)
  const plotCropId = plots.find((p) => p.id === plotId)?.cropId ?? crops[0]?.id ?? ''
  useEffect(() => {
    if (open) {
      setKind(logKind(defaultKind))
      setQty(0)
      setRate(0)
      setPlotId(defaultPlotId ?? plots[0]?.id ?? '')
    }
  }, [open, defaultKind, defaultPlotId, plots])
  const live = useMemo(() => (kind === 'sale' ? qty * rate : 0), [kind, qty, rate])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{kind === 'sale' ? 'Add sale' : kind === 'health' ? 'Add health note' : 'Add expense'}</DialogTitle>
        <DialogDescription>
          {kind === 'health' ? 'Pest, disease, or a crop note on a plot.' : 'Date, plot, and amount. This updates the farm book.'}
        </DialogDescription>
        <Tabs value={kind} onValueChange={(value) => setKind(logKind(value))} className="mt-5">
          <TabsList>
            <TabsTrigger value="expense">Expense</TabsTrigger>
            <TabsTrigger value="sale">Sale</TabsTrigger>
            <TabsTrigger value="health">Health</TabsTrigger>
          </TabsList>
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              const plotId = String(fd.get('plotId'))
              const date = String(fd.get('date'))
              start(async () => {
                const res = await run(
                  async () => {
                    if (kind === 'sale') {
                      await createSaleAction({
                        farmId,
                        plotId,
                        cropId: String(fd.get('cropId')),
                        date,
                        quantity: Number(fd.get('quantity')),
                        unit: String(fd.get('unit') || 'kg'),
                        unitPrice: Number(fd.get('unitPrice')),
                        notes: String(fd.get('notes') ?? ''),
                      })
                    } else if (kind === 'health') {
                      await createObservationAction({
                        farmId,
                        plotId,
                        kind: String(fd.get('issue')) as 'crop' | 'pest' | 'disease',
                        date,
                        name: String(fd.get('name') ?? ''),
                        severity: String(fd.get('severity') || 'moderate'),
                        note: String(fd.get('notes') ?? ''),
                      })
                    } else {
                      await createExpenseAction({
                        farmId,
                        plotId,
                        category: String(fd.get('category')),
                        date,
                        amount: Number(fd.get('amount')),
                        notes: String(fd.get('notes') ?? ''),
                      })
                    }
                  },
                  { ok: kind === 'sale' ? 'Sale saved' : kind === 'health' ? 'Health note saved' : 'Expense saved' },
                )
                if (res.ok) onOpenChange(false)
              })
            }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Date">
                <Input id="date" name="date" type="date" defaultValue={today} required />
              </Field>
              <Field label="Plot">
                <Select name="plotId" value={plotId} onChange={(e) => setPlotId(e.target.value)} required>
                  {plots.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <TabsContent value="expense">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Category">
                  <Select name="category" disabled={kind !== 'expense'}>
                    {['fertilizer', 'seeds', 'labour', 'irrigation', 'machinery', 'fuel', 'other'].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Amount">
                  <Input name="amount" type="number" min="1" required={kind === 'expense'} placeholder="4500" disabled={kind !== 'expense'} />
                </Field>
              </div>
            </TabsContent>

            <TabsContent value="sale">
              <Field label="What we sold">
                <Select key={`${plotId}-${plotCropId}`} name="cropId" defaultValue={plotCropId} required={kind === 'sale'} disabled={kind !== 'sale'}>
                  {crops.map((crop) => (
                    <option key={crop.id} value={crop.id}>
                      {crop.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Quantity">
                  <Input
                    name="quantity"
                    type="number"
                    step="0.01"
                    required={kind === 'sale'}
                    placeholder="0"
                    onChange={(e) => setQty(Number(e.target.value))}
                    disabled={kind !== 'sale'}
                  />
                </Field>
                <Field label="Unit">
                  <Input name="unit" defaultValue="kg" disabled={kind !== 'sale'} />
                </Field>
                <Field label="Rate">
                  <Input
                    name="unitPrice"
                    type="number"
                    required={kind === 'sale'}
                    placeholder="0"
                    onChange={(e) => setRate(Number(e.target.value))}
                    disabled={kind !== 'sale'}
                  />
                </Field>
              </div>
              <p className="mt-3 rounded-lg bg-[#eef2ff] px-3 py-2 text-sm text-primary">Sale value ₹{live || 0}</p>
            </TabsContent>

            <TabsContent value="health">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="What did you see?">
                  <Select name="issue" defaultValue="pest" disabled={kind !== 'health'}>
                    <option value="pest">Pest</option>
                    <option value="disease">Disease</option>
                    <option value="crop">Just a note</option>
                  </Select>
                </Field>
                <Field label="Name" hint="Leave blank if unsure">
                  <Input name="name" placeholder="Whitefly" disabled={kind !== 'health'} />
                </Field>
                <Field label="How bad">
                  <Select name="severity" defaultValue="moderate" disabled={kind !== 'health'}>
                    <option value="low">Low</option>
                    <option value="moderate">Medium</option>
                    <option value="high">High — needs action</option>
                  </Select>
                </Field>
              </div>
            </TabsContent>

            <Field label={kind === 'health' ? 'What you saw' : 'Notes'}>
              <Input
                name="notes"
                required={kind === 'health'}
                placeholder={
                  kind === 'health' ? 'Leaves turning yellow on canal side' : kind === 'sale' ? 'Buyer or lot' : 'What you paid for'
                }
              />
            </Field>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
