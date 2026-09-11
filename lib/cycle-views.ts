import { prisma } from '@/lib/prisma'
import { cycleFinance } from '@/lib/services/finance'

export type CycleMoney = Awaited<ReturnType<typeof cycleFinance>>

export async function plotCyclesWithMoney(farmId: string, plotId: string) {
  const cycles = await prisma.cropCycle.findMany({
    where: { plotId, plot: { farmId } },
    include: { crop: true, variety: true },
    orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
  })
  return Promise.all(cycles.map(async (cycle) => ({ cycle, money: await cycleFinance(cycle.id) })))
}

export function groupCyclesByYear<T extends { cycle: { year: number }; money: CycleMoney }>(rows: T[]) {
  const years = [...new Set(rows.map((r) => r.cycle.year))].sort((a, b) => b - a)
  return years.map((year) => {
    const items = rows.filter((r) => r.cycle.year === year)
    return {
      year,
      items,
      money: {
        expenses: items.reduce((s, r) => s + r.money.expenses, 0),
        revenue: items.reduce((s, r) => s + r.money.revenue, 0),
        profit: items.reduce((s, r) => s + r.money.profit, 0),
        yieldQty: items.reduce((s, r) => s + r.money.yieldQty, 0),
      },
    }
  })
}

export async function cycleDetail(farmId: string, plotId: string, cycleId: string) {
  const cycle = await prisma.cropCycle.findFirstOrThrow({
    where: { id: cycleId, plotId, plot: { farmId } },
    include: {
      crop: true,
      variety: true,
      plot: true,
      activities: { orderBy: { date: 'desc' } },
      expenses: { where: { voided: false }, orderBy: { date: 'desc' } },
      labour: { orderBy: { date: 'desc' } },
      harvests: { orderBy: { date: 'desc' } },
      sales: { orderBy: { date: 'desc' } },
      irrigations: { orderBy: { date: 'desc' } },
    },
  })
  const money = await cycleFinance(cycle.id)
  return { cycle, money }
}

export async function plotYearDetail(farmId: string, plotId: string, year: number) {
  const cycles = await prisma.cropCycle.findMany({
    where: { plotId, year, plot: { farmId } },
    include: { crop: true, variety: true },
    orderBy: { createdAt: 'desc' },
  })
  const ids = cycles.map((c) => c.id)
  if (!ids.length) {
    return {
      cycles: [],
      money: { expenses: 0, revenue: 0, profit: 0, yieldQty: 0 },
      activities: [],
      expenses: [],
      labour: [],
      harvests: [],
      sales: [],
      irrigations: [],
    }
  }
  const [activities, expenses, labour, harvests, sales, irrigations, withMoney] = await Promise.all([
    prisma.activity.findMany({
      where: { plotId, cropCycleId: { in: ids } },
      orderBy: { date: 'desc' },
    }),
    prisma.expense.findMany({
      where: { plotId, voided: false, cropCycleId: { in: ids } },
      orderBy: { date: 'desc' },
    }),
    prisma.labourRecord.findMany({
      where: { plotId, cropCycleId: { in: ids } },
      orderBy: { date: 'desc' },
    }),
    prisma.harvest.findMany({
      where: { plotId, cropCycleId: { in: ids } },
      orderBy: { date: 'desc' },
    }),
    prisma.sale.findMany({
      where: { plotId, cropCycleId: { in: ids } },
      orderBy: { date: 'desc' },
    }),
    prisma.irrigationRecord.findMany({
      where: { plotId, cropCycleId: { in: ids } },
      orderBy: { date: 'desc' },
    }),
    Promise.all(cycles.map(async (cycle) => ({ cycle, money: await cycleFinance(cycle.id) }))),
  ])
  const money = {
    expenses: withMoney.reduce((s, r) => s + r.money.expenses, 0),
    revenue: withMoney.reduce((s, r) => s + r.money.revenue, 0),
    profit: withMoney.reduce((s, r) => s + r.money.profit, 0),
    yieldQty: withMoney.reduce((s, r) => s + r.money.yieldQty, 0),
  }
  return { cycles: withMoney, money, activities, expenses, labour, harvests, sales, irrigations }
}
