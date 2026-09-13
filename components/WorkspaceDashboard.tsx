'use client'

import { useMemo, useState, useTransition } from 'react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { IndianRupee, Loader2, Pencil, Plus, ShieldAlert, Trash2, TrendingUp, Wallet } from 'lucide-react'
import {
  deleteExpenseAction,
  deleteExpensesAction,
  plantNewCycleAction,
  updatePlotAction,
} from '@/lib/actions'
import { useFeedback } from '@/components/feedback'
import { CropPickerField } from '@/components/CropPicker'
import { ActivityLogForm } from '@/components/ActivityLogForm'
import { HealthCard, type HealthRow } from '@/components/HealthCard'
import { MonthlyMoneyChart, SpendByCategoryChart } from '@/components/MoneyCharts'
import { PlotMapLazy } from '@/components/PlotMapLazy'
import { PlotActions } from '@/components/PlotActions'
import { Button } from '@/components/ui/button'
import { Card, CardHint, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Table, Td, Th } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { inr } from '@/lib/utils'
import { farmCenter, farmWorkingRing } from '@/lib/geo'

type Money = { expenses: number; revenue: number; profit: number }
type PlotCard = {
  plot: { id: string; name: string; code: string; acres: number; status: string; geoJson: string | null }
  money: Money
  cycle: {
    crop: { id: string; name: string }
    status: string
    year: number
    season: string
    start: string | null
    end: string | null
  } | null
}
type Row = { id: string; date: string; plotId?: string | null; plotName: string; label: string; amount: number }

function formatDay(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return format(new Date(y, m - 1, d), 'd MMM yyyy')
}

function dateRangeLabel(from: string, to: string) {
  if (from && to) return `${formatDay(from)} – ${formatDay(to)}`
  if (from) return `From ${formatDay(from)}`
  if (to) return `Until ${formatDay(to)}`
  return ''
}

function inRange(iso: string, from: string, to: string, plotId: string, rowPlotId?: string | null) {
  const day = iso.slice(0, 10)
  if (from && day < from) return false
  if (to && day > to) return false
  if (plotId && rowPlotId !== plotId) return false
  return true
}

export function WorkspaceDashboard(props: {
  farmId: string
  farmName: string
  area: number
  activePlots: number
  totalPlots: number
  finance: Money
  categorySpend: { category: string; amount: number }[]
  monthly: { month: string; spent: number; earned: number }[]
  health: { counts: { ok: number; watch: number; action: number }; rows: HealthRow[] }
  plotCards: PlotCard[]
  activities: { id: string; type: string; date: string; totalCost: number; plot: { id: string; name: string } }[]
  cycles: { id: string; year: number; status: string; season: string; crop: { name: string }; plot: { name: string; id: string } }[]
  crops: { id: string; name: string }[]
  expenses: Row[]
  sales: Row[]
  farmLat?: number | null
  farmLng?: number | null
  farmGeoJson?: string | null
}) {
  const {
    farmId,
    farmName,
    area,
    activePlots,
    totalPlots,
    finance,
    categorySpend,
    monthly,
    health,
    plotCards,
    cycles,
    crops,
    expenses,
    sales,
  } = props
  const router = useRouter()
  const [selected, setSelected] = useState(plotCards[0]?.plot.id ?? '')
  const [logOpen, setLogOpen] = useState(false)
  const [logKind, setLogKind] = useState('expense')
  const [bookTab, setBookTab] = useState('expenses')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [filterPlot, setFilterPlot] = useState('')
  const [edit, setEdit] = useState(false)
  const [addCycle, setAddCycle] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<Row | null>(null)
  const [deleteAllExpenses, setDeleteAllExpenses] = useState(false)
  const [pending, start] = useTransition()
  const { run } = useFeedback()
  const current = plotCards.find((p) => p.plot.id === selected) ?? plotCards[0]
  const scoped = plotCards.find((p) => p.plot.id === filterPlot)
  const farmMeta = { lat: props.farmLat, lng: props.farmLng, geoJson: props.farmGeoJson }
  const farmRing = useMemo(
    () => farmWorkingRing(farmMeta, plotCards.map((p) => p.plot)),
    [plotCards, props.farmGeoJson, props.farmLat, props.farmLng],
  )
  const mapCenter = farmCenter(farmMeta, plotCards.map((p) => p.plot))

  const rangeFrom = from || scoped?.cycle?.start || ''
  const rangeTo = to || scoped?.cycle?.end || ''
  const filtered = Boolean(from || to || filterPlot)
  const exp = expenses.filter((r) => inRange(r.date, rangeFrom, rangeTo, filterPlot, r.plotId))
  const inc = sales.filter((r) => inRange(r.date, rangeFrom, rangeTo, filterPlot, r.plotId))
  const expSum = exp.reduce((s, r) => s + r.amount, 0)
  const incSum = inc.reduce((s, r) => s + r.amount, 0)

  const moneyOut = filtered ? expSum : finance.expenses
  const moneyIn = filtered ? incSum : finance.revenue
  const profit = moneyIn - moneyOut
  const scopedArea = scoped ? scoped.plot.acres : area
  const scopedGrowing = scoped
    ? scoped.plot.status !== 'fallow'
      ? 1
      : 0
    : activePlots
  const scopedPlots = scoped ? 1 : totalPlots
  const rangeText = dateRangeLabel(rangeFrom, rangeTo)
  const scopeLine = [
    scoped ? scoped.plot.name : 'All plots',
    rangeText || (scoped && !scoped.cycle ? 'no crop dates' : ''),
    scoped?.cycle?.crop.name,
    `${scopedArea.toFixed(1)} acres`,
    scoped
      ? scoped.plot.status !== 'fallow'
        ? 'growing'
        : 'fallow'
      : `${scopedGrowing} of ${scopedPlots} plots growing`,
  ]
    .filter(Boolean)
    .join(' · ')

  function applyPlot(id: string) {
    setFilterPlot(id)
    if (id) setSelected(id)
    const next = plotCards.find((p) => p.plot.id === id)
    if (id && next?.cycle?.start && next.cycle.end) {
      setFrom(next.cycle.start)
      setTo(next.cycle.end)
    } else if (id) {
      setFrom('')
      setTo('')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{farmName}</p>
          <h2 className="text-2xl font-semibold tracking-tight">My farm today</h2>
          <p className="mt-1 text-sm text-muted-foreground">{scopeLine}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setLogKind(bookTab === 'sales' ? 'sale' : 'expense')
              setLogOpen(true)
            }}
          >
            <Plus className="h-4 w-4" /> Log entry
          </Button>
          <Button variant="outline" onClick={() => setAddCycle(true)}>
            Add crop
          </Button>
          <Button variant="outline" onClick={() => router.push(`/app/farms/${farmId}/map`)}>
            New plot
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <Field label="From">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Any date" />
        </Field>
        <Field label="To">
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} placeholder="Any date" />
        </Field>
        <Field label="Plot">
          <Select value={filterPlot} onChange={(e) => applyPlot(e.target.value)}>
            <option value="">All plots</option>
            {plotCards.map((p) => (
              <option key={p.plot.id} value={p.plot.id}>
                {p.plot.name}
              </option>
            ))}
          </Select>
        </Field>
        {filtered ? (
          <Button
            variant="ghost"
            onClick={() => {
              setFrom('')
              setTo('')
              setFilterPlot('')
            }}
          >
            Show all
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={IndianRupee}
          label="Expenses"
          value={inr(moneyOut)}
          hint="Everything you spent"
          tone="bg-[#fff1f2]"
        />
          <Stat icon={TrendingUp} label="Sales" value={inr(moneyIn)} hint="Crop sales" tone="bg-[#f0fdf4]" />
        <Stat
          icon={Wallet}
          label={profit >= 0 ? 'Profit' : 'Loss'}
          value={inr(Math.abs(profit))}
          hint="Money in − money out"
          tone="bg-[#eef2ff]"
        />
        <Stat
          icon={ShieldAlert}
          label="Needs action"
          value={`${health.counts.action} plot${health.counts.action === 1 ? '' : 's'}`}
          hint="Pest or disease marked high"
          tone={health.counts.action ? 'bg-[#fff1f2]' : 'bg-[#f0fdf4]'}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <SpendByCategoryChart data={categorySpend} />
        <MonthlyMoneyChart data={monthly} />
      </div>

      <HealthCard farmId={farmId} counts={health.counts} rows={health.rows} />

      <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <CardHint>Plots</CardHint>
              <CardTitle>Farm map</CardTitle>
            </div>
            <Button size="sm" variant="outline" onClick={() => router.push(`/app/farms/${farmId}/map`)}>
              Draw
            </Button>
          </div>
          <div className="map-frame relative isolate z-0 h-[min(52vh,340px)] w-full overflow-hidden rounded-xl border border-border">
            <PlotMapLazy
              plots={plotCards.map((p) => p.plot)}
              center={mapCenter}
              selectedId={selected}
              farmRing={farmRing}
              className="h-full min-h-[340px] w-full"
              onSelect={(id) => {
                setSelected(id)
                setFilterPlot(id)
              }}
            />
          </div>
        </Card>

        {current ? (
          <Card>
            <div className="flex items-start justify-between">
              <div>
                <CardHint>Plot {current.plot.code}</CardHint>
                <CardTitle className="text-lg">{current.plot.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {current.cycle?.crop.name ?? 'No crop'} · {current.plot.acres} ac · {current.plot.status}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Button size="icon" variant="outline" onClick={() => setEdit(true)} aria-label="Edit plot name">
                  <Pencil className="h-4 w-4" />
                </Button>
                <PlotActions
                  farmId={farmId}
                  plotId={current.plot.id}
                  plotName={current.plot.name}
                  after="farm"
                  compact
                />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-lg bg-[#fff1f2] p-3">
                <p className="text-xs text-muted-foreground">Money out</p>
                <p className="num mt-1 font-semibold">{inr(current.money.expenses)}</p>
              </div>
              <div className="rounded-lg bg-[#f0fdf4] p-3">
                <p className="text-xs text-muted-foreground">Money in</p>
                <p className="num mt-1 font-semibold">{inr(current.money.revenue)}</p>
              </div>
              <div className="rounded-lg bg-[#eef2ff] p-3">
                <p className="text-xs text-muted-foreground">Profit</p>
                <p className="num mt-1 font-semibold">{inr(current.money.profit)}</p>
              </div>
            </div>
            <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
              {cycles
                .filter((c) => c.plot.id === current.plot.id)
                .slice(0, 4)
                .map((c) => (
                  <li key={c.id}>
                    {c.season} · {c.crop.name} · {c.status}
                  </li>
                ))}
            </ul>
          </Card>
        ) : (
          <Card className="grid place-items-center text-sm text-muted-foreground">Add a plot to start the book.</Card>
        )}
      </div>

      <Card>
        <Tabs value={bookTab} onValueChange={setBookTab}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="sales">Sales</TabsTrigger>
            </TabsList>
            <Button
              size="sm"
              onClick={() => {
                setLogKind(bookTab === 'sales' ? 'sale' : 'expense')
                setLogOpen(true)
              }}
            >
              <Plus className="h-4 w-4" /> {bookTab === 'sales' ? 'Add sale' : 'Add expense'}
            </Button>
          </div>
          <TabsContent value="expenses">
            <Ledger
              rows={exp}
              detail="Spent on"
              empty="No expenses for this date or plot. Use Add expense."
              onDelete={setExpenseToDelete}
              onDeleteAll={() => setDeleteAllExpenses(true)}
            />
          </TabsContent>
          <TabsContent value="sales">
            <Ledger rows={inc} detail="Sold" empty="No sales for this date or plot. Use Add sale." />
          </TabsContent>
        </Tabs>
      </Card>

      <ActivityLogForm
        open={logOpen}
        onOpenChange={setLogOpen}
        farmId={farmId}
        plots={plotCards.map((p) => ({
          id: p.plot.id,
          name: p.plot.name,
          cropId: p.cycle?.crop.id,
        }))}
        crops={crops}
        defaultPlotId={filterPlot || current?.plot.id}
        defaultKind={logKind}
      />

      <Dialog open={Boolean(expenseToDelete)} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
        <DialogContent>
          <DialogTitle>Delete this expense?</DialogTitle>
          <DialogDescription>
            {expenseToDelete
              ? `${expenseToDelete.plotName} · ${expenseToDelete.label} · ${inr(expenseToDelete.amount)}`
              : ''}
            . It will be removed from totals and charts.
          </DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setExpenseToDelete(null)} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending || !expenseToDelete}
              onClick={() => {
                if (!expenseToDelete) return
                start(async () => {
                  const result = await run(
                    () => deleteExpenseAction({ farmId, expenseId: expenseToDelete.id }),
                    { ok: 'Expense deleted' },
                  )
                  if (result.ok) setExpenseToDelete(null)
                })
              }}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {pending ? 'Deleting…' : 'Delete expense'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteAllExpenses} onOpenChange={setDeleteAllExpenses}>
        <DialogContent>
          <DialogTitle>Delete all shown expenses?</DialogTitle>
          <DialogDescription>
            This removes {exp.length} expense{exp.length === 1 ? '' : 's'} totaling {inr(expSum)} from the current
            date and plot filters. Other expenses are not changed.
          </DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteAllExpenses(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending || !exp.length}
              onClick={() => {
                start(async () => {
                  const result = await run(
                    () => deleteExpensesAction({ farmId, expenseIds: exp.map((expense) => expense.id) }),
                    { ok: `${exp.length} expense${exp.length === 1 ? '' : 's'} deleted` },
                  )
                  if (result.ok) setDeleteAllExpenses(false)
                })
              }}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {pending ? 'Deleting…' : `Delete ${exp.length} expenses`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={edit} onOpenChange={setEdit}>
        <DialogContent>
          <DialogTitle>Edit plot</DialogTitle>
          <DialogDescription>Identity only. Crop history stays on the plot.</DialogDescription>
          {current ? (
            <form
              className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                start(async () => {
                  const res = await run(
                    () =>
                      updatePlotAction({
                        farmId,
                        plotId: current.plot.id,
                        code: String(fd.get('code')),
                        name: String(fd.get('name')),
                        acres: Number(fd.get('acres')),
                        status: String(fd.get('status')),
                      }),
                    { ok: 'Plot updated' },
                  )
                  if (res.ok) setEdit(false)
                })
              }}
            >
              <PlainField name="code" label="Plot number" defaultValue={current.plot.code} />
              <PlainField name="name" label="Name" defaultValue={current.plot.name} />
              <PlainField name="acres" label="Area (acres)" defaultValue={String(current.plot.acres)} />
              <PlainField name="status" label="Status" defaultValue={current.plot.status} />
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEdit(false)}>
                  Cancel
                </Button>
                <Button disabled={pending}>
                  {pending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                    </>
                  ) : (
                    'Save record'
                  )}
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={addCycle} onOpenChange={setAddCycle}>
        <DialogContent>
          <DialogTitle>Add crop cycle</DialogTitle>
          <DialogDescription>Does not overwrite older cycles on this plot.</DialogDescription>
          <form
            className="mt-4 grid gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              start(async () => {
                const res = await run(
                  () =>
                    plantNewCycleAction({
                      farmId,
                      plotId: String(fd.get('plotId')),
                      cropId: String(fd.get('cropId')),
                      startDate: String(fd.get('startDate')),
                      endDate: String(fd.get('endDate')),
                    }),
                  { ok: 'Crop cycle planted' },
                )
                if (res.ok) setAddCycle(false)
              })
            }}
          >
            <div>
              <Label>Plot</Label>
              <Select name="plotId" defaultValue={current?.plot.id}>
                {plotCards.map((p) => (
                  <option key={p.plot.id} value={p.plot.id}>
                    {p.plot.name}
                  </option>
                ))}
              </Select>
            </div>
            <CropPickerField farmId={farmId} crops={crops} defaultValue={crops[0]?.id} label="Crop" />
            <div>
              <Label>Start date</Label>
              <Input name="startDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </div>
            <div>
              <Label>End date</Label>
              <Input
                name="endDate"
                type="date"
                required
                defaultValue={new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddCycle(false)}>
                Cancel
              </Button>
              <Button disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  'Save record'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Ledger({
  rows,
  detail,
  empty = 'Nothing here for this date or plot.',
  onDelete,
  onDeleteAll,
}: {
  rows: Row[]
  detail: string
  empty?: string
  onDelete?: (row: Row) => void
  onDeleteAll?: () => void
}) {
  const total = rows.reduce((s, r) => s + r.amount, 0)
  return (
    <>
      <Table>
        <thead>
          <tr>
            <Th>Date</Th>
            <Th>Plot</Th>
            <Th>{detail}</Th>
            <Th className="text-right">Amount</Th>
            {onDelete ? <Th className="w-12"><span className="sr-only">Actions</span></Th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <Td>{r.date.slice(0, 10)}</Td>
              <Td>{r.plotName}</Td>
              <Td className="capitalize">{r.label}</Td>
              <Td className="num text-right">{inr(r.amount)}</Td>
              {onDelete ? (
                <Td className="text-right">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Delete ${r.label} expense for ${r.plotName}`}
                    onClick={() => onDelete(r)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </Td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </Table>
      {rows.length ? (
        <div className="mt-3 flex items-center justify-end gap-3">
          {onDeleteAll ? (
            <Button type="button" size="sm" variant="outline" className="text-destructive" onClick={onDeleteAll}>
              <Trash2 className="h-4 w-4" /> Delete all shown
            </Button>
          ) : null}
          <p className="text-right text-sm font-medium">Total {inr(total)}</p>
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>
      )}
    </>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof IndianRupee
  label: string
  value: string
  hint: string
  tone: string
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <span className={`grid h-7 w-7 place-items-center rounded-lg ${tone}`}>
          <Icon className="h-4 w-4 text-[#475569]" />
        </span>
      </div>
      <p className="num mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </Card>
  )
}

function PlainField({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input name={name} defaultValue={defaultValue} />
    </div>
  )
}
