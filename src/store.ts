import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { activityTotal } from './finance'
import { geodesicAreaSqm } from './geo'
import { createSeedState, DEFAULT_ACTIVITY_TYPES } from './seed'
import type {
  Activity,
  ActivityType,
  AppState,
  Attachment,
  CropCycle,
  DiaryEntry,
  DiseaseObservation,
  Equipment,
  Expense,
  ExpenseCategory,
  Farm,
  FarmTask,
  FieldObservation,
  Harvest,
  Income,
  InventoryItem,
  IrrigationLog,
  LabourLog,
  PestObservation,
  Plot,
  Settings,
  SoilTest,
  User,
  Worker,
} from './types'
import { fromSqm } from './units'

export function uid(): string {
  return crypto.randomUUID()
}

export function stamp(): string {
  return new Date().toISOString()
}

function nextPlotNumber(plots: Plot[], farmId: string): string {
  const n = plots.filter((p) => p.farmId === farmId).length + 1
  return `P-${String(n).padStart(3, '0')}`
}

const PLOT_COLORS = ['#2f6b3a', '#c45c26', '#b0892e', '#3d6b8a', '#6b3d5a', '#4a7c59', '#8c4a2f', '#2c5f4e']

function expensesFromActivity(activity: Activity): Expense[] {
  const rows: { category: ExpenseCategory; amount: number; notes: string }[] = []
  if (activity.labourCost > 0) rows.push({ category: 'labour', amount: activity.labourCost, notes: 'From activity' })
  if (activity.machineryCost > 0)
    rows.push({ category: 'machinery', amount: activity.machineryCost, notes: 'From activity' })
  if (activity.materialCost > 0) rows.push({ category: 'other', amount: activity.materialCost, notes: 'Material from activity' })
  if (activity.otherCost > 0) rows.push({ category: 'other', amount: activity.otherCost, notes: 'From activity' })
  return rows.map((r) => ({
    id: uid(),
    plotId: activity.plotId,
    cropCycleId: activity.cropCycleId,
    activityId: activity.id,
    category: r.category,
    amount: r.amount,
    date: activity.date,
    vendor: activity.person,
    notes: r.notes,
    createdAt: stamp(),
    updatedAt: stamp(),
  }))
}

export type FarmStore = AppState & {
  setUser: (patch: Partial<User>) => void
  setSettings: (patch: Partial<Settings>) => void
  setActiveFarm: (id: string | null) => void
  addFarm: (farm: Omit<Farm, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => string
  updateFarm: (id: string, patch: Partial<Farm>) => void
  deleteFarm: (id: string) => void
  addPlot: (plot: Omit<Plot, 'id' | 'createdAt' | 'updatedAt' | 'plotNumber' | 'area'> & { area?: number }) => string
  updatePlot: (id: string, patch: Partial<Plot>) => void
  deletePlot: (id: string) => void
  addCropCycle: (cycle: Omit<CropCycle, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateCropCycle: (id: string, patch: Partial<CropCycle>) => void
  addActivityType: (name: string, description?: string) => string
  addActivity: (activity: Omit<Activity, 'id' | 'createdAt' | 'updatedAt' | 'totalCost'>) => string
  updateActivity: (id: string, patch: Partial<Activity>) => void
  deleteActivity: (id: string) => void
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateExpense: (id: string, patch: Partial<Expense>) => void
  deleteExpense: (id: string) => void
  addIncome: (income: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateIncome: (id: string, patch: Partial<Income>) => void
  deleteIncome: (id: string) => void
  addAttachmentToActivity: (activityId: string, file: Attachment) => void
  addInventory: (row: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => string
  useInventory: (itemId: string, used: number, plotId: string | null, notes: string) => string | null
  addPest: (row: Omit<PestObservation, 'id' | 'createdAt' | 'updatedAt'>) => string
  addDisease: (row: Omit<DiseaseObservation, 'id' | 'createdAt' | 'updatedAt'>) => string
  addObservation: (row: Omit<FieldObservation, 'id' | 'createdAt' | 'updatedAt'>) => string
  addSoilTest: (row: Omit<SoilTest, 'id' | 'createdAt' | 'updatedAt'>) => string
  addIrrigation: (row: Omit<IrrigationLog, 'id' | 'createdAt' | 'updatedAt'>) => string
  addWorker: (row: Omit<Worker, 'id' | 'createdAt' | 'updatedAt'>) => string
  addLabourLog: (row: Omit<LabourLog, 'id' | 'createdAt' | 'updatedAt'>) => string
  addEquipment: (row: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>) => string
  addHarvest: (row: Omit<Harvest, 'id' | 'createdAt' | 'updatedAt'>) => string
  addTask: (row: Omit<FarmTask, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateTask: (id: string, patch: Partial<FarmTask>) => void
  addDiary: (row: Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>) => string
  resetDemo: () => void
  clearAll: () => void
}

export const useFarmStore = create<FarmStore>()(
  persist(
    (set, get) => ({
      ...createSeedState(),
      setUser: (patch) =>
        set((s) => ({ user: { ...s.user, ...patch, updatedAt: stamp() } })),
      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      setActiveFarm: (id) => set({ activeFarmId: id }),
      addFarm: (farm) => {
        const id = uid()
        const t = stamp()
        set((s) => ({
          farms: [
            ...s.farms,
            { ...farm, id, userId: s.user.id, createdAt: t, updatedAt: t },
          ],
          activeFarmId: id,
        }))
        return id
      },
      updateFarm: (id, patch) =>
        set((s) => ({
          farms: s.farms.map((f) => (f.id === id ? { ...f, ...patch, updatedAt: stamp() } : f)),
        })),
      deleteFarm: (id) =>
        set((s) => {
          const plotIds = new Set(s.plots.filter((p) => p.farmId === id).map((p) => p.id))
          return {
            farms: s.farms.filter((f) => f.id !== id),
            plots: s.plots.filter((p) => p.farmId !== id),
            cropCycles: s.cropCycles.filter((c) => !plotIds.has(c.plotId)),
            activities: s.activities.filter((a) => !plotIds.has(a.plotId)),
            expenses: s.expenses.filter((e) => !plotIds.has(e.plotId)),
            incomes: s.incomes.filter((e) => !plotIds.has(e.plotId)),
            activeFarmId: s.activeFarmId === id ? s.farms.find((f) => f.id !== id)?.id ?? null : s.activeFarmId,
          }
        }),
      addPlot: (plot) => {
        const id = uid()
        const t = stamp()
        const s = get()
        const plotNumber = nextPlotNumber(s.plots, plot.farmId)
        const color = plot.color || PLOT_COLORS[s.plots.filter((p) => p.farmId === plot.farmId).length % PLOT_COLORS.length]
        const farm = s.farms.find((f) => f.id === plot.farmId)
        const unit = plot.areaUnit || farm?.areaUnit || s.settings.defaultAreaUnit
        const area =
          plot.area ??
          (plot.boundary ? fromSqm(geodesicAreaSqm(plot.boundary), unit) : 0)
        set({
          plots: [
            ...s.plots,
            { ...plot, id, plotNumber, color, area, areaUnit: unit, createdAt: t, updatedAt: t },
          ],
        })
        return id
      },
      updatePlot: (id, patch) =>
        set((s) => ({
          plots: s.plots.map((p) => {
            if (p.id !== id) return p
            if (patch.boundary && JSON.stringify(patch.boundary) === JSON.stringify(p.boundary) && Object.keys(patch).length === 1) {
              return p
            }
            const next = { ...p, ...patch, updatedAt: stamp() }
            if (patch.boundary) {
              next.area = fromSqm(geodesicAreaSqm(patch.boundary), next.areaUnit)
            }
            return next
          }),
        })),
      deletePlot: (id) =>
        set((s) => ({
          plots: s.plots.filter((p) => p.id !== id),
          cropCycles: s.cropCycles.filter((c) => c.plotId !== id),
          activities: s.activities.filter((a) => a.plotId !== id),
          expenses: s.expenses.filter((e) => e.plotId !== id),
          incomes: s.incomes.filter((e) => e.plotId !== id),
        })),
      addCropCycle: (cycle) => {
        const id = uid()
        const t = stamp()
        set((s) => ({ cropCycles: [...s.cropCycles, { ...cycle, id, createdAt: t, updatedAt: t }] }))
        return id
      },
      updateCropCycle: (id, patch) =>
        set((s) => ({
          cropCycles: s.cropCycles.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: stamp() } : c)),
        })),
      addActivityType: (name, description = '') => {
        const id = uid()
        const type: ActivityType = { id, name: name.trim(), description, isCustom: true }
        set((s) => ({ activityTypes: [...s.activityTypes, type] }))
        return id
      },
      addActivity: (activity) => {
        const id = uid()
        const t = stamp()
        const totalCost = activityTotal(activity)
        const saved: Activity = { ...activity, id, totalCost, createdAt: t, updatedAt: t }
        set((s) => ({
          activities: [...s.activities, saved],
          expenses: [...s.expenses, ...expensesFromActivity(saved)],
        }))
        return id
      },
      updateActivity: (id, patch) =>
        set((s) => {
          const prev = s.activities.find((a) => a.id === id)
          if (!prev) return s
          const next: Activity = {
            ...prev,
            ...patch,
            totalCost: activityTotal({ ...prev, ...patch }),
            updatedAt: stamp(),
          }
          const keep = s.expenses.filter((e) => e.activityId !== id)
          return {
            activities: s.activities.map((a) => (a.id === id ? next : a)),
            expenses: [...keep, ...expensesFromActivity(next)],
          }
        }),
      deleteActivity: (id) =>
        set((s) => ({
          activities: s.activities.filter((a) => a.id !== id),
          expenses: s.expenses.filter((e) => e.activityId !== id),
        })),
      addExpense: (expense) => {
        const id = uid()
        const t = stamp()
        set((s) => ({ expenses: [...s.expenses, { ...expense, id, createdAt: t, updatedAt: t }] }))
        return id
      },
      updateExpense: (id, patch) =>
        set((s) => ({
          expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: stamp() } : e)),
        })),
      deleteExpense: (id) => set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),
      addIncome: (income) => {
        const id = uid()
        const t = stamp()
        set((s) => ({ incomes: [...s.incomes, { ...income, id, createdAt: t, updatedAt: t }] }))
        return id
      },
      updateIncome: (id, patch) =>
        set((s) => ({
          incomes: s.incomes.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: stamp() } : e)),
        })),
      deleteIncome: (id) => set((s) => ({ incomes: s.incomes.filter((e) => e.id !== id) })),
      addAttachmentToActivity: (activityId, file) =>
        set((s) => ({
          activities: s.activities.map((a) =>
            a.id === activityId ? { ...a, attachments: [...a.attachments, file], updatedAt: stamp() } : a,
          ),
        })),
      addInventory: (row) => {
        const id = uid()
        const t = stamp()
        set((s) => ({ inventory: [...s.inventory, { ...row, id, createdAt: t, updatedAt: t }] }))
        return id
      },
      useInventory: (itemId, used, plotId, notes) => {
        const s = get()
        const item = s.inventory.find((i) => i.id === itemId)
        if (!item || used <= 0 || used > item.quantity) return null
        const remaining = item.quantity - used
        const moveId = uid()
        set({
          inventory: s.inventory.map((i) => (i.id === itemId ? { ...i, quantity: remaining, updatedAt: stamp() } : i)),
          inventoryMoves: [
            ...s.inventoryMoves,
            {
              id: moveId,
              itemId,
              plotId,
              cropCycleId: plotId ? currentCycleId(s, plotId) : null,
              date: stamp().slice(0, 10),
              used,
              previous: item.quantity,
              remaining,
              notes,
              createdAt: stamp(),
            },
          ],
        })
        return moveId
      },
      addPest: (row) => addRow(set, 'pests', row),
      addDisease: (row) => addRow(set, 'diseases', row),
      addObservation: (row) => addRow(set, 'observations', row),
      addSoilTest: (row) => addRow(set, 'soilTests', row),
      addIrrigation: (row) => addRow(set, 'irrigations', row),
      addWorker: (row) => addRow(set, 'workers', row),
      addLabourLog: (row) => addRow(set, 'labourLogs', row),
      addEquipment: (row) => addRow(set, 'equipment', row),
      addHarvest: (row) => addRow(set, 'harvests', row),
      addTask: (row) => addRow(set, 'tasks', row),
      updateTask: (id, patch) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: stamp() } : t)) })),
      addDiary: (row) => addRow(set, 'diary', row),
      resetDemo: () => set({ ...createSeedState() }),
      clearAll: () => {
        const empty = createSeedState()
        set({
          ...empty,
          farms: [],
          plots: [],
          cropCycles: [],
          activities: [],
          expenses: [],
          incomes: [],
          inventory: [],
          inventoryMoves: [],
          pests: [],
          diseases: [],
          observations: [],
          soilTests: [],
          irrigations: [],
          workers: [],
          labourLogs: [],
          equipment: [],
          harvests: [],
          tasks: [],
          diary: [],
          activityTypes: DEFAULT_ACTIVITY_TYPES,
          activeFarmId: null,
        })
      },
    }),
    {
      name: 'farmos-os-v1',
      merge: (persisted, current) => {
        const p = (persisted || {}) as Partial<AppState>
        const seed = createSeedState()
        return {
          ...current,
          ...p,
          inventory: p.inventory ?? seed.inventory,
          inventoryMoves: p.inventoryMoves ?? seed.inventoryMoves,
          pests: p.pests ?? seed.pests,
          diseases: p.diseases ?? seed.diseases,
          observations: p.observations ?? seed.observations,
          soilTests: p.soilTests ?? seed.soilTests,
          irrigations: p.irrigations ?? seed.irrigations,
          workers: p.workers ?? seed.workers,
          labourLogs: p.labourLogs ?? seed.labourLogs,
          equipment: p.equipment ?? seed.equipment,
          harvests: p.harvests ?? seed.harvests,
          tasks: p.tasks ?? seed.tasks,
          diary: p.diary ?? seed.diary,
          settings: { ...seed.settings, ...p.settings },
        }
      },
    },
  ),
)

function currentCycleId(s: AppState, plotId: string): string | null {
  const growing = s.cropCycles.find((c) => c.plotId === plotId && c.status === 'growing')
  return growing?.id ?? null
}

function addRow<K extends keyof AppState>(
  set: (fn: (s: FarmStore) => Partial<FarmStore>) => void,
  key: K,
  row: object,
): string {
  const id = uid()
  const t = stamp()
  set((s) => ({
    [key]: [...(s[key] as object[]), { ...row, id, createdAt: t, updatedAt: t }],
  }) as Partial<FarmStore>)
  return id
}

export function useActiveFarm() {
  return useFarmStore((s) => s.farms.find((f) => f.id === s.activeFarmId) ?? s.farms[0] ?? null)
}

export function useFarmPlots(farmId?: string) {
  const plots = useFarmStore((s) => s.plots)
  const active = useFarmStore((s) => s.activeFarmId)
  return plots.filter((p) => p.farmId === (farmId || active))
}
