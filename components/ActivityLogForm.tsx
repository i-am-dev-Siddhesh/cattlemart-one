'use client'

import { useMemo, useState, useTransition } from 'react'
import { createActivityAction, createExpenseAction, createSaleAction } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const WORK = [
  'Ploughing',
  'Sowing',
  'Weeding',
  'Fertilizing',
  'Spraying',
  'Irrigation',
  'Harvesting',
  'Labour work',
  'Machinery work',
  'Other',
]

export function ActivityLogForm({
  open,
  onOpenChange,
  farmId,
  plots,
  defaultPlotId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  farmId: string
  plots: { id: string; name: string }[]
  defaultPlotId?: string
}) {
  const [kind, setKind] = useState('work')
  const [pending, start] = useTransition()
  const [qty, setQty] = useState(0)
  const [rate, setRate] = useState(0)
  const [workers, setWorkers] = useState(0)
  const [wage, setWage] = useState(450)
  const today = new Date().toISOString().slice(0, 10)
  const live = useMemo(() => {
    if (kind === 'sale') return qty * rate
    if (kind === 'labour' || kind === 'work') return workers * wage
    return 0
  }, [kind, qty, rate, workers, wage])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Log activity</DialogTitle>
        <DialogDescription>Pick a type, then date and plot. Totals update as you type.</DialogDescription>
        <Tabs value={kind} onValueChange={setKind} className="mt-5">
          <TabsList>
            <TabsTrigger value="work">Work</TabsTrigger>
            <TabsTrigger value="expense">Expense</TabsTrigger>
            <TabsTrigger value="labour">Labour</TabsTrigger>
            <TabsTrigger value="sale">Sale</TabsTrigger>
          </TabsList>
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              const plotId = String(fd.get('plotId'))
              const date = String(fd.get('date'))
              start(async () => {
                if (kind === 'expense') {
                  await createExpenseAction({
                    farmId,
                    plotId,
                    category: String(fd.get('category')),
                    date,
                    amount: Number(fd.get('amount')),
                    notes: String(fd.get('notes') ?? ''),
                  })
                } else if (kind === 'sale') {
                  await createSaleAction({
                    farmId,
                    plotId,
                    date,
                    quantity: Number(fd.get('quantity')),
                    unit: String(fd.get('unit') || 'kg'),
                    unitPrice: Number(fd.get('unitPrice')),
                  })
                } else {
                  await createActivityAction({
                    farmId,
                    plotId,
                    type: kind === 'labour' ? 'Labour work' : String(fd.get('type') || 'Other'),
                    date,
                    description: String(fd.get('notes') ?? ''),
                    labourWorkers: Number(fd.get('workers') || 0) || undefined,
                    labourRate: Number(fd.get('wage') || 0) || undefined,
                    inputCost: kind === 'work' ? Number(fd.get('inputCost') || 0) || undefined : undefined,
                    expenseCategory:
                      kind === 'work' && Number(fd.get('inputCost') || 0)
                        ? String(fd.get('category') || 'other')
                        : kind === 'labour'
                          ? 'labour'
                          : undefined,
                  })
                }
                onOpenChange(false)
              })
            }}
          >
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date">
                <Input id="date" name="date" type="date" defaultValue={today} required />
              </Field>
              <Field label="Plot">
                <Select name="plotId" defaultValue={defaultPlotId} required>
                  {plots.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <TabsContent value="work">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Work type">
                  <Select name="type">
                    {WORK.map((w) => (
                      <option key={w}>{w}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Input / other cost" hint="Optional ₹">
                  <Input name="inputCost" type="number" min="0" placeholder="0" />
                </Field>
                <Field label="Workers">
                  <Input name="workers" type="number" min="0" placeholder="0" value={workers || ''} onChange={(e) => setWorkers(Number(e.target.value))} />
                </Field>
                <Field label="Wage per worker-day">
                  <Input name="wage" type="number" min="0" placeholder="450" value={wage || ''} onChange={(e) => setWage(Number(e.target.value))} />
                </Field>
                <Field label="Expense category">
                  <Select name="category" defaultValue="other">
                    {['other', 'fertilizer', 'seeds', 'irrigation', 'machinery'].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">Labour total {live ? `₹${live}` : '—'}</p>
            </TabsContent>

            <TabsContent value="labour">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Workers">
                  <Input name="workers" type="number" min="1" required placeholder="4" value={workers || ''} onChange={(e) => setWorkers(Number(e.target.value))} />
                </Field>
                <Field label="Wage per worker-day">
                  <Input name="wage" type="number" min="1" required placeholder="450" value={wage || ''} onChange={(e) => setWage(Number(e.target.value))} />
                </Field>
              </div>
              <p className="mt-3 rounded-lg bg-[#f0fdf4] px-3 py-2 text-sm text-[#166534]">Pays ₹{live || 0} and posts labour + expense on the plot.</p>
            </TabsContent>

            <TabsContent value="expense">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Category">
                  <Select name="category">
                    {['fertilizer', 'seeds', 'labour', 'irrigation', 'machinery', 'fuel', 'other'].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Amount">
                  <Input name="amount" type="number" min="1" required placeholder="4500" />
                </Field>
              </div>
            </TabsContent>

            <TabsContent value="sale">
              <div className="grid grid-cols-3 gap-4">
                <Field label="Quantity">
                  <Input name="quantity" type="number" step="0.01" required placeholder="0" onChange={(e) => setQty(Number(e.target.value))} />
                </Field>
                <Field label="Unit">
                  <Input name="unit" defaultValue="kg" />
                </Field>
                <Field label="Rate">
                  <Input name="unitPrice" type="number" required placeholder="0" onChange={(e) => setRate(Number(e.target.value))} />
                </Field>
              </div>
              <p className="mt-3 rounded-lg bg-[#eef2ff] px-3 py-2 text-sm text-primary">Sale value ₹{live || 0}</p>
            </TabsContent>

            <Field label="Notes">
              <Input name="notes" placeholder="What happened in the field" />
            </Field>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
