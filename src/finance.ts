import type { Activity, AppState, CropCycle, Expense, Income, Plot } from './types'
import { convertArea } from './units'

export type DateRange = { from?: string; to?: string }

export function inRange(date: string, range?: DateRange): boolean {
  if (!range) return true
  if (range.from && date < range.from) return false
  if (range.to && date > range.to) return false
  return true
}

export function currentCycle(cycles: CropCycle[], plotId: string): CropCycle | undefined {
  const list = cycles.filter((c) => c.plotId === plotId)
  return (
    list.find((c) => c.status === 'growing') ||
    list.find((c) => c.status === 'planned') ||
    [...list].sort((a, b) => b.plantingDate.localeCompare(a.plantingDate))[0]
  )
}

export function plotExpenses(state: AppState, plotId: string, range?: DateRange, cropCycleId?: string): Expense[] {
  return state.expenses.filter(
    (e) =>
      e.plotId === plotId &&
      inRange(e.date, range) &&
      (!cropCycleId || e.cropCycleId === cropCycleId),
  )
}

export function plotIncomes(state: AppState, plotId: string, range?: DateRange, cropCycleId?: string): Income[] {
  return state.incomes.filter(
    (e) =>
      e.plotId === plotId &&
      inRange(e.date, range) &&
      (!cropCycleId || e.cropCycleId === cropCycleId),
  )
}

export type PlotFinance = {
  plot: Plot
  expense: number
  income: number
  profit: number
  labour: number
  machinery: number
  material: number
  other: number
  costPerAcre: number
  revenuePerAcre: number
  profitPerAcre: number
  yieldAmount: number | null
  crop: string
}

export function acresOf(plot: Plot): number {
  return convertArea(plot.area, plot.areaUnit, 'acre') || 0
}

export function summarizePlot(
  state: AppState,
  plot: Plot,
  range?: DateRange,
  cropCycleId?: string,
): PlotFinance {
  const expenses = plotExpenses(state, plot.id, range, cropCycleId)
  const incomes = plotIncomes(state, plot.id, range, cropCycleId)
  const expense = expenses.reduce((s, e) => s + e.amount, 0)
  const income = incomes.reduce((s, e) => s + e.amount, 0)
  const activities = state.activities.filter(
    (a) =>
      a.plotId === plot.id &&
      inRange(a.date, range) &&
      (!cropCycleId || a.cropCycleId === cropCycleId),
  )
  const labour = activities.reduce((s, a) => s + a.labourCost, 0)
  const machinery = activities.reduce((s, a) => s + a.machineryCost, 0)
  const material = activities.reduce((s, a) => s + a.materialCost, 0)
  const other = activities.reduce((s, a) => s + a.otherCost, 0)
  const acres = acresOf(plot) || 1
  const cycle = cropCycleId
    ? state.cropCycles.find((c) => c.id === cropCycleId)
    : currentCycle(state.cropCycles, plot.id)
  return {
    plot,
    expense,
    income,
    profit: income - expense,
    labour,
    machinery,
    material,
    other,
    costPerAcre: expense / acres,
    revenuePerAcre: income / acres,
    profitPerAcre: (income - expense) / acres,
    yieldAmount: cycle?.actualYield ?? cycle?.expectedYield ?? null,
    crop: cycle?.cropName ?? '—',
  }
}

export function expenseBreakdown(expenses: Expense[]): { key: string; amount: number }[] {
  const map = new Map<string, number>()
  for (const e of expenses) {
    map.set(e.category, (map.get(e.category) || 0) + e.amount)
  }
  return [...map.entries()]
    .map(([key, amount]) => ({ key, amount }))
    .sort((a, b) => b.amount - a.amount)
}

export function activityTotal(a: Pick<Activity, 'labourCost' | 'machineryCost' | 'materialCost' | 'otherCost'>): number {
  return roundMoney(a.labourCost + a.machineryCost + a.materialCost + a.otherCost)
}

export function roundMoney(n: number): number {
  return Math.round((n || 0) * 100) / 100
}

export function farmTotals(state: AppState, farmId: string, range?: DateRange) {
  const plots = state.plots.filter((p) => p.farmId === farmId)
  const rows = plots.map((p) => summarizePlot(state, p, range))
  const expense = rows.reduce((s, r) => s + r.expense, 0)
  const income = rows.reduce((s, r) => s + r.income, 0)
  const acres = plots.reduce((s, p) => s + acresOf(p), 0)
  return {
    plots,
    rows,
    expense,
    income,
    profit: income - expense,
    acres,
    avgProfitPerAcre: acres ? (income - expense) / acres : 0,
  }
}
