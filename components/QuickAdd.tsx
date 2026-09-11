'use client'

import { useState, useTransition } from 'react'
import {
  createActivityAction,
  createExpenseAction,
  createHarvestAction,
  createIrrigationAction,
  createObservationAction,
  createSaleAction,
  createTaskAction,
} from '@/lib/actions'

const items = [
  { id: 'crop', label: 'Crop', hint: 'Plant a new cycle from the plot page so history is kept.' },
  { id: 'activity', label: 'Activity' },
  { id: 'expense', label: 'Expense' },
  { id: 'irrigation', label: 'Irrigation' },
  { id: 'fertilizer', label: 'Fertilizer' },
  { id: 'pest', label: 'Pest' },
  { id: 'disease', label: 'Disease' },
  { id: 'labour', label: 'Labour' },
  { id: 'machinery', label: 'Machinery' },
  { id: 'harvest', label: 'Harvest' },
  { id: 'observation', label: 'Observation' },
  { id: 'task', label: 'Task' },
  { id: 'sale', label: 'Sale' },
]

type PlotOpt = { id: string; name: string }

export function QuickAdd({ farmId, plots }: { farmId: string; plots: PlotOpt[] }) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const today = new Date().toISOString().slice(0, 10)
  const defaultPlot = plots[0]?.id ?? ''

  function close() {
    setOpen(false)
    setKind(null)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white"
      >
        Quick Add
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center">
          <div className="surface max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">What do you want to record?</h2>
              <button type="button" onClick={close} className="text-sm text-muted-foreground">
                Close
              </button>
            </div>
            {!kind ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setKind(item.id)}
                    className="rounded-xl border border-border bg-white px-3 py-3 text-left text-sm hover:border-primary"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : (
              <form
                className="mt-4 space-y-3 text-sm"
                onSubmit={(e) => {
                  e.preventDefault()
                  const fd = new FormData(e.currentTarget)
                  const plotId = String(fd.get('plotId') ?? defaultPlot)
                  start(async () => {
                    if (kind === 'activity' || kind === 'fertilizer' || kind === 'labour' || kind === 'machinery') {
                      await createActivityAction({
                        farmId,
                        plotId,
                        type:
                          kind === 'fertilizer'
                            ? 'Fertilizing'
                            : kind === 'labour'
                              ? 'Labour work'
                              : kind === 'machinery'
                                ? 'Machinery work'
                                : String(fd.get('type') ?? 'Other'),
                        date: String(fd.get('date')),
                        description: String(fd.get('description') ?? ''),
                        labourWorkers: Number(fd.get('labourWorkers') || 0) || undefined,
                        labourRate: Number(fd.get('labourRate') || 0) || undefined,
                        inputName: String(fd.get('inputName') || '') || undefined,
                        inputQty: Number(fd.get('inputQty') || 0) || undefined,
                        inputCost: Number(fd.get('inputCost') || 0) || undefined,
                        expenseCategory: kind === 'fertilizer' ? 'fertilizer' : kind === 'labour' ? 'labour' : undefined,
                      })
                    } else if (kind === 'expense') {
                      await createExpenseAction({
                        farmId,
                        plotId,
                        category: String(fd.get('category')),
                        date: String(fd.get('date')),
                        amount: Number(fd.get('amount')),
                        notes: String(fd.get('notes') ?? ''),
                      })
                    } else if (kind === 'irrigation') {
                      await createIrrigationAction({
                        farmId,
                        plotId,
                        date: String(fd.get('date')),
                        method: String(fd.get('method') ?? ''),
                        quantityL: Number(fd.get('quantityL') || 0) || undefined,
                        cost: Number(fd.get('cost') || 0) || undefined,
                      })
                    } else if (kind === 'pest' || kind === 'disease' || kind === 'observation') {
                      await createObservationAction({
                        farmId,
                        plotId,
                        kind: kind === 'observation' ? 'crop' : kind,
                        date: String(fd.get('date')),
                        note: String(fd.get('note')),
                        name: String(fd.get('name') ?? ''),
                        severity: String(fd.get('severity') ?? 'moderate'),
                      })
                    } else if (kind === 'harvest') {
                      await createHarvestAction({
                        farmId,
                        plotId,
                        date: String(fd.get('date')),
                        quantity: Number(fd.get('quantity')),
                        unit: String(fd.get('unit') || 'kg'),
                      })
                    } else if (kind === 'sale') {
                      await createSaleAction({
                        farmId,
                        plotId,
                        date: String(fd.get('date')),
                        quantity: Number(fd.get('quantity')),
                        unit: String(fd.get('unit') || 'kg'),
                        unitPrice: Number(fd.get('unitPrice')),
                      })
                    } else if (kind === 'task') {
                      await createTaskAction({
                        farmId,
                        plotId,
                        title: String(fd.get('title')),
                        dueDate: String(fd.get('dueDate') || ''),
                      })
                    }
                    close()
                  })
                }}
              >
                {kind === 'crop' ? (
                  <p className="text-muted-foreground">
                    New crops are planted from a plot page so the previous cycle stays in history.
                  </p>
                ) : null}
                {plots.length ? (
                  <label className="block">
                    Plot
                    <select name="plotId" defaultValue={defaultPlot} className="control mt-1">
                      {plots.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label className="block">
                  Date
                  <input name="date" type="date" defaultValue={today} className="control mt-1" />
                </label>
                {kind === 'activity' ? (
                  <label className="block">
                    Activity type
                    <input name="type" required className="control mt-1" placeholder="Weeding" />
                  </label>
                ) : null}
                {kind === 'fertilizer' ? (
                  <>
                    <input name="inputName" placeholder="Product (must match inventory name)" className="control" />
                    <div className="grid grid-cols-2 gap-2">
                      <input name="inputQty" type="number" step="0.1" placeholder="Qty kg" className="control" />
                      <input name="inputCost" type="number" placeholder="Cost ₹" className="control" />
                    </div>
                  </>
                ) : null}
                {kind === 'labour' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <input name="labourWorkers" type="number" placeholder="Workers" className="control" />
                    <input name="labourRate" type="number" placeholder="₹ / worker-day" className="control" />
                  </div>
                ) : null}
                {kind === 'machinery' ? (
                  <input name="inputCost" type="number" placeholder="Machine cost ₹" className="control" />
                ) : null}
                {kind === 'expense' ? (
                  <>
                    <input name="category" required placeholder="Category (fertilizer, labour…)" className="control" />
                    <input name="amount" required type="number" placeholder="Amount ₹" className="control" />
                    <input name="notes" placeholder="Notes" className="control" />
                  </>
                ) : null}
                {kind === 'irrigation' ? (
                  <>
                    <input name="method" placeholder="Method" className="control" />
                    <input name="quantityL" type="number" placeholder="Litres" className="control" />
                    <input name="cost" type="number" placeholder="Optional cost ₹" className="control" />
                  </>
                ) : null}
                {kind === 'pest' || kind === 'disease' || kind === 'observation' ? (
                  <>
                    {kind !== 'observation' ? (
                      <input name="name" placeholder={kind === 'pest' ? 'Pest' : 'Disease'} className="control" />
                    ) : null}
                    <input name="severity" defaultValue="moderate" className="control" />
                    <textarea name="note" required placeholder="What did you see?" className="control" />
                  </>
                ) : null}
                {kind === 'harvest' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <input name="quantity" required type="number" step="0.01" placeholder="Quantity" className="control" />
                    <input name="unit" defaultValue="kg" className="control" />
                  </div>
                ) : null}
                {kind === 'sale' ? (
                  <>
                    <input name="quantity" required type="number" step="0.01" placeholder="Quantity" className="control" />
                    <input name="unit" defaultValue="kg" className="control" />
                    <input name="unitPrice" required type="number" placeholder="Price / unit ₹" className="control" />
                  </>
                ) : null}
                {kind === 'task' ? (
                  <>
                    <input name="title" required placeholder="Task title" className="control" />
                    <input name="dueDate" type="date" className="control" />
                  </>
                ) : null}
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setKind(null)} className="control">
                    Back
                  </button>
                  {kind !== 'crop' ? (
                    <button disabled={pending} className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white">
                      {pending ? 'Saving…' : 'Save'}
                    </button>
                  ) : null}
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
