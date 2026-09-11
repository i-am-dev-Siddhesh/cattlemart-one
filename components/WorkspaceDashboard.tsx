'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, IndianRupee, LayoutGrid, MapPin, Pencil, Plus, TrendingUp } from 'lucide-react'
import { plantNewCycleAction, updatePlotAction } from '@/lib/actions'
import { ActivityLogForm } from '@/components/ActivityLogForm'
import { PlotMapLazy } from '@/components/PlotMapLazy'
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
  cycle: { crop: { name: string }; status: string; year: number; season: string } | null
}
type Row = { id: string; date: string; plotId?: string | null; plotName: string; label: string; amount: number }

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
  season: string
  area: number
  activePlots: number
  totalPlots: number
  finance: Money
  plotCards: PlotCard[]
  activities: { id: string; type: string; date: string; totalCost: number; plot: { id: string; name: string } }[]
  cycles: { id: string; year: number; status: string; season: string; crop: { name: string }; plot: { name: string; id: string } }[]
  crops: { id: string; name: string }[]
  expenses: Row[]
  sales: Row[]
  labour: Row[]
  farmLat?: number | null
  farmLng?: number | null
  farmGeoJson?: string | null
}) {
  const { farmId, farmName, season, area, activePlots, totalPlots, finance, plotCards, activities, cycles, crops, expenses, sales, labour } = props
  const router = useRouter()
  const [selected, setSelected] = useState(plotCards[0]?.plot.id ?? '')
  const [logOpen, setLogOpen] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [filterPlot, setFilterPlot] = useState('')
  const [edit, setEdit] = useState(false)
  const [addCycle, setAddCycle] = useState(false)
  const [pending, start] = useTransition()
  const current = plotCards.find((p) => p.plot.id === selected) ?? plotCards[0]
  const farmMeta = { lat: props.farmLat, lng: props.farmLng, geoJson: props.farmGeoJson }
  const farmRing = useMemo(() => farmWorkingRing(farmMeta, plotCards.map((p) => p.plot)), [plotCards, props.farmGeoJson, props.farmLat, props.farmLng])
  const mapCenter = farmCenter(farmMeta, plotCards.map((p) => p.plot))

  const acts = activities.filter((a) => inRange(a.date, from, to, filterPlot, a.plot.id))
  const exp = expenses.filter((r) => inRange(r.date, from, to, filterPlot, r.plotId))
  const inc = sales.filter((r) => inRange(r.date, from, to, filterPlot, r.plotId))
  const lab = labour.filter((r) => inRange(r.date, from, to, filterPlot, r.plotId))
  const expSum = exp.reduce((s, r) => s + r.amount, 0)
  const incSum = inc.reduce((s, r) => s + r.amount, 0)
  const labSum = lab.reduce((s, r) => s + r.amount, 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{farmName}</p>
          <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
          <p className="mt-1 text-sm text-muted-foreground">Track work, labour, spend, and sales by date and plot.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setLogOpen(true)}>
            <Plus className="h-4 w-4" /> Log activity
          </Button>
          <Button variant="outline" onClick={() => router.push(`/app/farms/${farmId}/map`)}>
            New plot
          </Button>
          <Button variant="outline" onClick={() => setAddCycle(true)}>
            Add crop cycle
          </Button>
        </div>
      </div>

      <Card className="flex flex-wrap items-end gap-4">
        <Field label="From">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To">
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Field label="Plot">
          <Select
            value={filterPlot}
            onChange={(e) => {
              setFilterPlot(e.target.value)
              if (e.target.value) setSelected(e.target.value)
            }}
          >
            <option value="">All plots</option>
            {plotCards.map((p) => (
              <option key={p.plot.id} value={p.plot.id}>
                {p.plot.name}
              </option>
            ))}
          </Select>
        </Field>
        <Button variant="ghost" onClick={() => { setFrom(''); setTo(''); setFilterPlot('') }}>
          Clear
        </Button>
        <p className="ml-auto text-sm text-muted-foreground">
          Filter: spend {inr(expSum)} · sales {inr(incSum)} · labour {inr(labSum)} · P/L {inr(incSum - expSum)}
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat icon={MapPin} label="Total area" value={`${area.toFixed(1)} acres`} hint="All plots" />
        <Stat icon={LayoutGrid} label="Active plots" value={`${activePlots} of ${totalPlots}`} hint="Not fallow" />
        <Stat icon={IndianRupee} label="Expenses" value={inr(from || to || filterPlot ? expSum : finance.expenses)} hint="Recorded" />
        <Stat icon={TrendingUp} label="Sales" value={inr(from || to || filterPlot ? incSum : finance.revenue)} hint="Recorded" />
        <Stat icon={BarChart3} label="Earn / loss" value={inr(from || to || filterPlot ? incSum - expSum : finance.profit)} hint="Sales − expenses" />
      </div>

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
          <div className="relative h-[340px] w-full overflow-hidden rounded-xl border border-border">
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
              <Button size="icon" variant="outline" onClick={() => setEdit(true)} aria-label="Edit plot">
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-lg bg-[#fff1f2] p-3">
                <p className="text-xs text-muted-foreground">Spend</p>
                <p className="num mt-1 font-semibold">{inr(current.money.expenses)}</p>
              </div>
              <div className="rounded-lg bg-[#f0fdf4] p-3">
                <p className="text-xs text-muted-foreground">Sales</p>
                <p className="num mt-1 font-semibold">{inr(current.money.revenue)}</p>
              </div>
              <div className="rounded-lg bg-[#eef2ff] p-3">
                <p className="text-xs text-muted-foreground">P/L</p>
                <p className="num mt-1 font-semibold">{inr(current.money.profit)}</p>
              </div>
            </div>
            <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
              {cycles.filter((c) => c.plot.id === current.plot.id).slice(0, 4).map((c) => (
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
        <Tabs defaultValue="log">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="log">Activity log</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="sales">Sales</TabsTrigger>
              <TabsTrigger value="labour">Labour</TabsTrigger>
              <TabsTrigger value="plots">Plot P/L</TabsTrigger>
            </TabsList>
            <Button size="sm" onClick={() => setLogOpen(true)}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          <TabsContent value="log">
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Plot</Th>
                  <Th>Work</Th>
                  <Th className="text-right">Cost</Th>
                </tr>
              </thead>
              <tbody>
                {acts.map((a) => (
                  <tr key={a.id}>
                    <Td>{a.date.slice(0, 10)}</Td>
                    <Td>{a.plot.name}</Td>
                    <Td>{a.type}</Td>
                    <Td className="num text-right">{inr(a.totalCost)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {!acts.length ? <p className="py-8 text-center text-sm text-muted-foreground">No work in this filter. Log an activity.</p> : null}
          </TabsContent>
          <TabsContent value="expenses">
            <Ledger rows={exp} />
          </TabsContent>
          <TabsContent value="sales">
            <Ledger rows={inc} />
          </TabsContent>
          <TabsContent value="labour">
            <Ledger rows={lab} />
          </TabsContent>
          <TabsContent value="plots">
            <Table>
              <thead>
                <tr>
                  <Th>Plot</Th>
                  <Th>Crop</Th>
                  <Th className="text-right">Spend</Th>
                  <Th className="text-right">Sales</Th>
                  <Th className="text-right">Earn / loss</Th>
                </tr>
              </thead>
              <tbody>
                {plotCards.map(({ plot, money, cycle }) => (
                  <tr key={plot.id} className="cursor-pointer" onClick={() => { setSelected(plot.id); setFilterPlot(plot.id) }}>
                    <Td>{plot.name}</Td>
                    <Td>{cycle?.crop.name ?? '—'}</Td>
                    <Td className="num text-right">{inr(money.expenses)}</Td>
                    <Td className="num text-right">{inr(money.revenue)}</Td>
                    <Td className="num text-right">{inr(money.profit)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TabsContent>
        </Tabs>
      </Card>

      <ActivityLogForm
        open={logOpen}
        onOpenChange={setLogOpen}
        farmId={farmId}
        plots={plotCards.map((p) => ({ id: p.plot.id, name: p.plot.name }))}
        defaultPlotId={filterPlot || current?.plot.id}
      />

      <Dialog open={edit} onOpenChange={setEdit}>
        <DialogContent>
          <DialogTitle>Edit plot</DialogTitle>
          <DialogDescription>Identity only. Crop history stays on the plot.</DialogDescription>
          {current ? (
            <form
              className="mt-4 grid grid-cols-2 gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                start(async () => {
                  await updatePlotAction({
                    farmId,
                    plotId: current.plot.id,
                    code: String(fd.get('code')),
                    name: String(fd.get('name')),
                    acres: Number(fd.get('acres')),
                    status: String(fd.get('status')),
                  })
                  setEdit(false)
                })
              }}
            >
              <Field name="code" label="Plot number" defaultValue={current.plot.code} />
              <Field name="name" label="Name" defaultValue={current.plot.name} />
              <Field name="acres" label="Area (acres)" defaultValue={String(current.plot.acres)} />
              <Field name="status" label="Status" defaultValue={current.plot.status} />
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEdit(false)}>Cancel</Button>
                <Button disabled={pending}>Save record</Button>
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
                await plantNewCycleAction({
                  farmId,
                  plotId: String(fd.get('plotId')),
                  cropId: String(fd.get('cropId')),
                  startDate: String(fd.get('startDate')),
                  endDate: String(fd.get('endDate')),
                })
                setAddCycle(false)
              })
            }}
          >
            <div>
              <Label>Plot</Label>
              <Select name="plotId" defaultValue={current?.plot.id}>
                {plotCards.map((p) => (
                  <option key={p.plot.id} value={p.plot.id}>{p.plot.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Crop</Label>
              <Select name="cropId">
                {crops.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
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
              <Button type="button" variant="outline" onClick={() => setAddCycle(false)}>Cancel</Button>
              <Button disabled={pending}>Save record</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Ledger({ rows }: { rows: Row[] }) {
  return (
    <>
      <Table>
        <thead>
          <tr>
            <Th>Date</Th>
            <Th>Plot</Th>
            <Th>Detail</Th>
            <Th className="text-right">Amount</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <Td>{r.date.slice(0, 10)}</Td>
              <Td>{r.plotName}</Td>
              <Td>{r.label}</Td>
              <Td className="num text-right">{inr(r.amount)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {!rows.length ? <p className="py-8 text-center text-sm text-muted-foreground">Nothing in this date / plot filter.</p> : null}
    </>
  )
}

function Stat({ icon: Icon, label, value, hint }: { icon: typeof MapPin; label: string; value: string; hint: string }) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-[#9aa8b8]" />
      </div>
      <p className="num mt-2 text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </Card>
  )
}

function Field({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input name={name} defaultValue={defaultValue} />
    </div>
  )
}
