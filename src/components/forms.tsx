import { useState } from 'react'
import type { Activity, Attachment, CropCycle, Expense, Farm, Income, Plot } from '../types'
import { parseAmount, todayIso } from '../units'
import { currentCycle } from '../finance'
import { uid, useFarmStore } from '../store'
import { Button, Field, useForm } from './ui'

function requireAmount(raw: string, label: string): number {
  const n = parseAmount(raw)
  if (n === null) throw new Error(`${label} must be a valid amount of 0 or more.`)
  return n
}

function requireDate(raw: string, label: string): string {
  if (!raw) throw new Error(`${label} is required.`)
  if (Number.isNaN(Date.parse(raw))) throw new Error(`${label} is not a valid date.`)
  return raw
}

export function FarmForm({
  initial,
  onDone,
}: {
  initial?: Farm
  onDone: () => void
}) {
  const addFarm = useFarmStore((s) => s.addFarm)
  const updateFarm = useFarmStore((s) => s.updateFarm)
  const settings = useFarmStore((s) => s.settings)
  const form = useForm({
    name: initial?.name || '',
    location: initial?.location || '',
    lat: String(initial?.center.lat ?? 19.9973),
    lng: String(initial?.center.lng ?? 73.7883),
    areaUnit: initial?.areaUnit || settings.defaultAreaUnit,
  })
  return (
    <form
      onSubmit={form.onSubmit((v) => {
        if (!v.name.trim()) throw new Error('Farm name is required.')
        const lat = Number(v.lat)
        const lng = Number(v.lng)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('Enter a valid map location.')
        const payload = {
          name: v.name.trim(),
          location: v.location.trim(),
          center: { lat, lng },
          totalArea: initial?.totalArea ?? 0,
          areaUnit: v.areaUnit as Farm['areaUnit'],
          boundary: initial?.boundary ?? null,
          layoutImage: initial?.layoutImage ?? null,
          layoutBounds: initial?.layoutBounds ?? null,
        }
        if (initial) updateFarm(initial.id, payload)
        else addFarm(payload)
        onDone()
      })}
    >
      <Field label="Farm name">
        <input value={form.values.name} onChange={(e) => form.set('name', e.target.value)} />
      </Field>
      <Field label="Location">
        <input value={form.values.location} onChange={(e) => form.set('location', e.target.value)} />
      </Field>
      <div className="form-grid">
        <Field label="Latitude">
          <input value={form.values.lat} onChange={(e) => form.set('lat', e.target.value)} />
        </Field>
        <Field label="Longitude">
          <input value={form.values.lng} onChange={(e) => form.set('lng', e.target.value)} />
        </Field>
      </div>
      <Field label="Area unit">
        <select value={form.values.areaUnit} onChange={(e) => form.set('areaUnit', e.target.value)}>
          <option value="acre">Acre</option>
          <option value="hectare">Hectare</option>
          <option value="cent">Cent</option>
          <option value="guntha">Guntha</option>
          <option value="sqft">Square feet</option>
          <option value="sqm">Square metre</option>
        </select>
      </Field>
      {form.error && <p className="error">{form.error}</p>}
      <Button type="submit">Save farm</Button>
    </form>
  )
}

export function PlotMetaForm({ plot, onDone }: { plot: Plot; onDone: () => void }) {
  const updatePlot = useFarmStore((s) => s.updatePlot)
  const form = useForm({
    name: plot.name,
    color: plot.color,
    status: plot.status,
    notes: plot.notes,
    area: String(plot.area),
    areaUnit: plot.areaUnit,
  })
  return (
    <form
      onSubmit={form.onSubmit((v) => {
        if (!v.name.trim()) throw new Error('Plot name is required.')
        const area = requireAmount(v.area, 'Area')
        updatePlot(plot.id, {
          name: v.name.trim(),
          color: v.color,
          status: v.status as Plot['status'],
          notes: v.notes,
          area,
          areaUnit: v.areaUnit as Plot['areaUnit'],
        })
        onDone()
      })}
    >
      <Field label="Plot name">
        <input value={form.values.name} onChange={(e) => form.set('name', e.target.value)} />
      </Field>
      <div className="form-grid">
        <Field label="Colour">
          <input type="color" value={form.values.color} onChange={(e) => form.set('color', e.target.value)} />
        </Field>
        <Field label="Status">
          <select value={form.values.status} onChange={(e) => form.set('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="fallow">Fallow</option>
            <option value="harvested">Harvested</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
        <Field label="Area">
          <input value={form.values.area} onChange={(e) => form.set('area', e.target.value)} />
        </Field>
        <Field label="Unit">
          <select value={form.values.areaUnit} onChange={(e) => form.set('areaUnit', e.target.value)}>
            <option value="acre">Acre</option>
            <option value="hectare">Hectare</option>
            <option value="cent">Cent</option>
            <option value="guntha">Guntha</option>
            <option value="sqft">Square feet</option>
            <option value="sqm">Square metre</option>
          </select>
        </Field>
      </div>
      <Field label="Notes">
        <textarea value={form.values.notes} onChange={(e) => form.set('notes', e.target.value)} />
      </Field>
      {form.error && <p className="error">{form.error}</p>}
      <Button type="submit">Save plot</Button>
    </form>
  )
}

export function CropForm({
  plots,
  plotId,
  initial,
  onDone,
}: {
  plots: Plot[]
  plotId?: string
  initial?: CropCycle
  onDone: () => void
}) {
  const add = useFarmStore((s) => s.addCropCycle)
  const update = useFarmStore((s) => s.updateCropCycle)
  const settings = useFarmStore((s) => s.settings)
  const form = useForm({
    plotId: initial?.plotId || plotId || plots[0]?.id || '',
    cropName: initial?.cropName || '',
    variety: initial?.variety || '',
    season: initial?.season || '2026 Kharif',
    plantingDate: initial?.plantingDate || todayIso(),
    expectedHarvestDate: initial?.expectedHarvestDate || '',
    actualHarvestDate: initial?.actualHarvestDate || '',
    seedQuantity: initial?.seedQuantity != null ? String(initial.seedQuantity) : '',
    seedCost: initial?.seedCost != null ? String(initial.seedCost) : '',
    expectedYield: initial?.expectedYield != null ? String(initial.expectedYield) : '',
    actualYield: initial?.actualYield != null ? String(initial.actualYield) : '',
    yieldUnit: initial?.yieldUnit || settings.defaultYieldUnit,
    status: initial?.status || 'growing',
    notes: initial?.notes || '',
  })
  return (
    <form
      onSubmit={form.onSubmit((v) => {
        if (!v.plotId) throw new Error('Choose a plot.')
        if (!v.cropName.trim()) throw new Error('Crop name is required.')
        const payload: Omit<CropCycle, 'id' | 'createdAt' | 'updatedAt'> = {
          plotId: v.plotId,
          cropName: v.cropName.trim(),
          variety: v.variety.trim(),
          season: v.season.trim(),
          plantingDate: requireDate(v.plantingDate, 'Planting date'),
          expectedHarvestDate: v.expectedHarvestDate,
          actualHarvestDate: v.actualHarvestDate,
          seedQuantity: v.seedQuantity ? requireAmount(v.seedQuantity, 'Seed quantity') : null,
          seedCost: v.seedCost ? requireAmount(v.seedCost, 'Seed cost') : null,
          expectedYield: v.expectedYield ? requireAmount(v.expectedYield, 'Expected yield') : null,
          actualYield: v.actualYield ? requireAmount(v.actualYield, 'Actual yield') : null,
          yieldUnit: v.yieldUnit as CropCycle['yieldUnit'],
          status: v.status as CropCycle['status'],
          notes: v.notes,
        }
        if (initial) update(initial.id, payload)
        else add(payload)
        onDone()
      })}
    >
      <p className="lede">Adding a crop starts a new cycle. Older seasons stay in history.</p>
      <div className="form-grid">
        <Field label="Plot">
          <select value={form.values.plotId} onChange={(e) => form.set('plotId', e.target.value)}>
            {plots.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Crop name">
          <input value={form.values.cropName} onChange={(e) => form.set('cropName', e.target.value)} />
        </Field>
        <Field label="Variety">
          <input value={form.values.variety} onChange={(e) => form.set('variety', e.target.value)} />
        </Field>
        <Field label="Season">
          <input value={form.values.season} onChange={(e) => form.set('season', e.target.value)} />
        </Field>
        <Field label="Planting date">
          <input type="date" value={form.values.plantingDate} onChange={(e) => form.set('plantingDate', e.target.value)} />
        </Field>
        <Field label="Expected harvest">
          <input type="date" value={form.values.expectedHarvestDate} onChange={(e) => form.set('expectedHarvestDate', e.target.value)} />
        </Field>
        <Field label="Actual harvest">
          <input type="date" value={form.values.actualHarvestDate} onChange={(e) => form.set('actualHarvestDate', e.target.value)} />
        </Field>
        <Field label="Status">
          <select value={form.values.status} onChange={(e) => form.set('status', e.target.value)}>
            <option value="planned">Planned</option>
            <option value="growing">Growing</option>
            <option value="harvested">Harvested</option>
            <option value="failed">Failed</option>
          </select>
        </Field>
        <Field label="Seed quantity">
          <input value={form.values.seedQuantity} onChange={(e) => form.set('seedQuantity', e.target.value)} />
        </Field>
        <Field label="Seed cost (₹)">
          <input value={form.values.seedCost} onChange={(e) => form.set('seedCost', e.target.value)} />
        </Field>
        <Field label="Expected yield">
          <input value={form.values.expectedYield} onChange={(e) => form.set('expectedYield', e.target.value)} />
        </Field>
        <Field label="Actual yield">
          <input value={form.values.actualYield} onChange={(e) => form.set('actualYield', e.target.value)} />
        </Field>
        <Field label="Yield unit">
          <select value={form.values.yieldUnit} onChange={(e) => form.set('yieldUnit', e.target.value)}>
            <option value="kg">Kg</option>
            <option value="quintal">Quintal</option>
            <option value="ton">Ton</option>
            <option value="bag">Bags</option>
          </select>
        </Field>
      </div>
      <Field label="Notes">
        <textarea value={form.values.notes} onChange={(e) => form.set('notes', e.target.value)} />
      </Field>
      {form.error && <p className="error">{form.error}</p>}
      <Button type="submit">{initial ? 'Save cycle' : 'Add crop cycle'}</Button>
    </form>
  )
}

export function ActivityForm({
  plots,
  plotId,
  initial,
  onDone,
}: {
  plots: Plot[]
  plotId?: string
  initial?: Activity
  onDone: () => void
}) {
  const types = useFarmStore((s) => s.activityTypes)
  const cycles = useFarmStore((s) => s.cropCycles)
  const addType = useFarmStore((s) => s.addActivityType)
  const add = useFarmStore((s) => s.addActivity)
  const update = useFarmStore((s) => s.updateActivity)
  const startPlot = initial?.plotId || plotId || plots[0]?.id || ''
  const current = currentCycle(cycles, startPlot)
  const form = useForm({
    plotId: startPlot,
    cropCycleId: initial?.cropCycleId || current?.id || '',
    activityTypeId: initial?.activityTypeId || types[0]?.id || '',
    date: initial?.date || todayIso(),
    quantity: initial?.quantity != null ? String(initial.quantity) : '',
    unit: initial?.unit || 'hour',
    labourCost: String(initial?.labourCost ?? 0),
    machineryCost: String(initial?.machineryCost ?? 0),
    materialCost: String(initial?.materialCost ?? 0),
    otherCost: String(initial?.otherCost ?? 0),
    person: initial?.person || '',
    notes: initial?.notes || '',
    customType: '',
  })
  const plotCycles = cycles.filter((c) => c.plotId === form.values.plotId)
  const [files, setFiles] = useState<Attachment[]>(initial?.attachments || [])
  return (
    <form
      onSubmit={form.onSubmit((v) => {
        if (!v.plotId) throw new Error('Choose a plot.')
        if (!v.activityTypeId) throw new Error('Choose an activity type.')
        const payload = {
          plotId: v.plotId,
          cropCycleId: v.cropCycleId || null,
          activityTypeId: v.activityTypeId,
          date: requireDate(v.date, 'Date'),
          quantity: v.quantity ? requireAmount(v.quantity, 'Quantity') : null,
          unit: v.unit as Activity['unit'],
          labourCost: requireAmount(v.labourCost, 'Labour cost'),
          machineryCost: requireAmount(v.machineryCost, 'Machinery cost'),
          materialCost: requireAmount(v.materialCost, 'Material cost'),
          otherCost: requireAmount(v.otherCost, 'Other cost'),
          person: v.person,
          notes: v.notes,
          attachments: files,
        }
        if (initial) update(initial.id, payload)
        else add(payload)
        onDone()
      })}
    >
      <div className="form-grid">
        <Field label="Plot">
          <select
            value={form.values.plotId}
            onChange={(e) => {
              const id = e.target.value
              const cc = currentCycle(cycles, id)
              form.set('plotId', id)
              form.set('cropCycleId', cc?.id || '')
            }}
          >
            {plots.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Current crop cycle">
          <select value={form.values.cropCycleId} onChange={(e) => form.set('cropCycleId', e.target.value)}>
            <option value="">None</option>
            {plotCycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.season} · {c.cropName}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Activity type">
          <select value={form.values.activityTypeId} onChange={(e) => form.set('activityTypeId', e.target.value)}>
            {types.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input type="date" value={form.values.date} onChange={(e) => form.set('date', e.target.value)} />
        </Field>
        <Field label="Quantity">
          <input value={form.values.quantity} onChange={(e) => form.set('quantity', e.target.value)} />
        </Field>
        <Field label="Unit">
          <select value={form.values.unit} onChange={(e) => form.set('unit', e.target.value)}>
            <option value="hour">Hours</option>
            <option value="day">Days</option>
            <option value="kg">Kg</option>
            <option value="litre">Litres</option>
            <option value="bag">Bags</option>
            <option value="number">Number</option>
          </select>
        </Field>
        <Field label="Labour cost (₹)">
          <input value={form.values.labourCost} onChange={(e) => form.set('labourCost', e.target.value)} />
        </Field>
        <Field label="Machinery cost (₹)">
          <input value={form.values.machineryCost} onChange={(e) => form.set('machineryCost', e.target.value)} />
        </Field>
        <Field label="Material cost (₹)">
          <input value={form.values.materialCost} onChange={(e) => form.set('materialCost', e.target.value)} />
        </Field>
        <Field label="Other cost (₹)">
          <input value={form.values.otherCost} onChange={(e) => form.set('otherCost', e.target.value)} />
        </Field>
        <Field label="Person / vendor">
          <input value={form.values.person} onChange={(e) => form.set('person', e.target.value)} />
        </Field>
      </div>
      <Field label="Notes">
        <textarea value={form.values.notes} onChange={(e) => form.set('notes', e.target.value)} />
      </Field>
      <Field label="Photos">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            const list = [...(e.target.files || [])]
            list.forEach((file) => {
              const reader = new FileReader()
              reader.onload = () => {
                setFiles((prev) => [...prev, { id: uid(), name: file.name, dataUrl: String(reader.result) }])
              }
              reader.readAsDataURL(file)
            })
          }}
        />
      </Field>
      {files.length > 0 && (
        <p className="lede">
          {files.length} photo{files.length === 1 ? '' : 's'} attached
        </p>
      )}
      <div className="row">
        <Field label="New custom activity type">
          <input value={form.values.customType} onChange={(e) => form.set('customType', e.target.value)} />
        </Field>
        <Button
          kind="ghost"
          onClick={() => {
            if (!form.values.customType.trim()) return
            const id = addType(form.values.customType.trim())
            form.set('activityTypeId', id)
            form.set('customType', '')
          }}
        >
          Add type
        </Button>
      </div>
      {form.error && <p className="error">{form.error}</p>}
      <Button type="submit">{initial ? 'Save activity' : 'Add activity'}</Button>
    </form>
  )
}

export function ExpenseForm({
  plots,
  plotId,
  onDone,
}: {
  plots: Plot[]
  plotId?: string
  onDone: () => void
}) {
  const cycles = useFarmStore((s) => s.cropCycles)
  const add = useFarmStore((s) => s.addExpense)
  const start = plotId || plots[0]?.id || ''
  const form = useForm({
    plotId: start,
    cropCycleId: currentCycle(cycles, start)?.id || '',
    category: 'other',
    amount: '',
    date: todayIso(),
    vendor: '',
    notes: '',
  })
  return (
    <form
      onSubmit={form.onSubmit((v) => {
        if (!v.plotId) throw new Error('Choose a plot.')
        add({
          plotId: v.plotId,
          cropCycleId: v.cropCycleId || null,
          activityId: null,
          category: v.category as Expense['category'],
          amount: requireAmount(v.amount, 'Amount'),
          date: requireDate(v.date, 'Date'),
          vendor: v.vendor,
          notes: v.notes,
        })
        onDone()
      })}
    >
      <div className="form-grid">
        <Field label="Plot">
          <select value={form.values.plotId} onChange={(e) => form.set('plotId', e.target.value)}>
            {plots.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Crop cycle">
          <select value={form.values.cropCycleId} onChange={(e) => form.set('cropCycleId', e.target.value)}>
            <option value="">None</option>
            {cycles
              .filter((c) => c.plotId === form.values.plotId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.season} · {c.cropName}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Category">
          <select value={form.values.category} onChange={(e) => form.set('category', e.target.value)}>
            <option value="land_preparation">Land preparation</option>
            <option value="labour">Labour</option>
            <option value="seeds">Seeds</option>
            <option value="fertilizers">Fertilizers</option>
            <option value="pesticides">Pesticides</option>
            <option value="irrigation">Irrigation</option>
            <option value="machinery">Machinery</option>
            <option value="fuel">Fuel</option>
            <option value="electricity">Electricity</option>
            <option value="transportation">Transportation</option>
            <option value="harvesting">Harvesting</option>
            <option value="storage">Storage</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Amount (₹)">
          <input value={form.values.amount} onChange={(e) => form.set('amount', e.target.value)} />
        </Field>
        <Field label="Date">
          <input type="date" value={form.values.date} onChange={(e) => form.set('date', e.target.value)} />
        </Field>
        <Field label="Vendor">
          <input value={form.values.vendor} onChange={(e) => form.set('vendor', e.target.value)} />
        </Field>
      </div>
      <Field label="Notes">
        <textarea value={form.values.notes} onChange={(e) => form.set('notes', e.target.value)} />
      </Field>
      {form.error && <p className="error">{form.error}</p>}
      <Button type="submit">Add expense</Button>
    </form>
  )
}

export function IncomeForm({
  plots,
  plotId,
  onDone,
}: {
  plots: Plot[]
  plotId?: string
  onDone: () => void
}) {
  const cycles = useFarmStore((s) => s.cropCycles)
  const add = useFarmStore((s) => s.addIncome)
  const start = plotId || plots[0]?.id || ''
  const form = useForm({
    plotId: start,
    cropCycleId: currentCycle(cycles, start)?.id || '',
    category: 'crop_sale',
    amount: '',
    quantity: '',
    unit: 'quintal',
    date: todayIso(),
    buyer: '',
    notes: '',
  })
  return (
    <form
      onSubmit={form.onSubmit((v) => {
        if (!v.plotId) throw new Error('Income must belong to a plot.')
        add({
          plotId: v.plotId,
          cropCycleId: v.cropCycleId || null,
          category: v.category as Income['category'],
          amount: requireAmount(v.amount, 'Amount'),
          quantity: v.quantity ? requireAmount(v.quantity, 'Quantity') : null,
          unit: v.unit as Income['unit'],
          date: requireDate(v.date, 'Date'),
          buyer: v.buyer,
          notes: v.notes,
        })
        onDone()
      })}
    >
      <div className="form-grid">
        <Field label="Plot">
          <select value={form.values.plotId} onChange={(e) => form.set('plotId', e.target.value)}>
            {plots.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Crop cycle">
          <select value={form.values.cropCycleId} onChange={(e) => form.set('cropCycleId', e.target.value)}>
            <option value="">None</option>
            {cycles
              .filter((c) => c.plotId === form.values.plotId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.season} · {c.cropName}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Category">
          <select value={form.values.category} onChange={(e) => form.set('category', e.target.value)}>
            <option value="crop_sale">Crop sales</option>
            <option value="byproduct">By-product sales</option>
            <option value="other">Other income</option>
          </select>
        </Field>
        <Field label="Amount (₹)">
          <input value={form.values.amount} onChange={(e) => form.set('amount', e.target.value)} />
        </Field>
        <Field label="Quantity">
          <input value={form.values.quantity} onChange={(e) => form.set('quantity', e.target.value)} />
        </Field>
        <Field label="Unit">
          <select value={form.values.unit} onChange={(e) => form.set('unit', e.target.value)}>
            <option value="kg">Kg</option>
            <option value="quintal">Quintal</option>
            <option value="ton">Ton</option>
            <option value="bag">Bags</option>
          </select>
        </Field>
        <Field label="Date">
          <input type="date" value={form.values.date} onChange={(e) => form.set('date', e.target.value)} />
        </Field>
        <Field label="Buyer">
          <input value={form.values.buyer} onChange={(e) => form.set('buyer', e.target.value)} />
        </Field>
      </div>
      <Field label="Notes">
        <textarea value={form.values.notes} onChange={(e) => form.set('notes', e.target.value)} />
      </Field>
      {form.error && <p className="error">{form.error}</p>}
      <Button type="submit">Add income</Button>
    </form>
  )
}
