import { prisma } from '@/lib/prisma'

export async function plotFinance(plotId: string) {
  const [expenseAgg, saleAgg, harvestAgg] = await Promise.all([
    prisma.expense.aggregate({
      where: { plotId, voided: false },
      _sum: { amount: true },
    }),
    prisma.sale.aggregate({
      where: { plotId },
      _sum: { net: true },
    }),
    prisma.harvest.aggregate({
      where: { plotId },
      _sum: { quantity: true },
    }),
  ])
  const expenses = expenseAgg._sum.amount ?? 0
  const revenue = saleAgg._sum.net ?? 0
  return {
    expenses,
    revenue,
    profit: revenue - expenses,
    yieldQty: harvestAgg._sum.quantity ?? 0,
    roi: expenses > 0 ? ((revenue - expenses) / expenses) * 100 : null,
  }
}

export async function cycleFinance(cropCycleId: string) {
  const [expenseAgg, saleAgg, harvestAgg] = await Promise.all([
    prisma.expense.aggregate({
      where: { cropCycleId, voided: false },
      _sum: { amount: true },
    }),
    prisma.sale.aggregate({
      where: { cropCycleId },
      _sum: { net: true },
    }),
    prisma.harvest.aggregate({
      where: { cropCycleId },
      _sum: { quantity: true, marketableQty: true, damagedQty: true },
    }),
  ])
  const expenses = expenseAgg._sum.amount ?? 0
  const revenue = saleAgg._sum.net ?? 0
  return {
    expenses,
    revenue,
    profit: revenue - expenses,
    yieldQty: harvestAgg._sum.quantity ?? 0,
    marketableQty: harvestAgg._sum.marketableQty ?? 0,
    damagedQty: harvestAgg._sum.damagedQty ?? 0,
    roi: expenses > 0 ? ((revenue - expenses) / expenses) * 100 : null,
  }
}

export async function farmFinance(farmId: string) {
  const [expenseAgg, saleAgg, byCategory] = await Promise.all([
    prisma.expense.aggregate({
      where: { farmId, voided: false },
      _sum: { amount: true },
    }),
    prisma.sale.aggregate({
      where: { farmId },
      _sum: { net: true },
    }),
    prisma.expense.groupBy({
      by: ['category'],
      where: { farmId, voided: false },
      _sum: { amount: true },
    }),
  ])
  const expenses = expenseAgg._sum.amount ?? 0
  const revenue = saleAgg._sum.net ?? 0
  return {
    expenses,
    revenue,
    profit: revenue - expenses,
    byCategory: byCategory.map((r) => ({
      category: r.category,
      amount: r._sum.amount ?? 0,
    })),
  }
}

export async function monthFinance(farmId: string, year: number, month: number) {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)
  const [expenseAgg, saleAgg] = await Promise.all([
    prisma.expense.aggregate({
      where: { farmId, voided: false, date: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
    prisma.sale.aggregate({
      where: { farmId, date: { gte: start, lt: end } },
      _sum: { net: true },
    }),
  ])
  return {
    expenses: expenseAgg._sum.amount ?? 0,
    revenue: saleAgg._sum.net ?? 0,
  }
}

export async function monthlyMoney(farmId: string, months = 6) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(1)
  start.setMonth(start.getMonth() - (months - 1))

  const [expenses, sales] = await Promise.all([
    prisma.expense.findMany({
      where: { farmId, voided: false, date: { gte: start } },
      select: { date: true, amount: true },
    }),
    prisma.sale.findMany({
      where: { farmId, date: { gte: start } },
      select: { date: true, net: true },
    }),
  ])

  const buckets = Array.from({ length: months }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1)
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: d.toLocaleString('en-IN', { month: 'short' }),
      spent: 0,
      earned: 0,
    }
  })
  const slot = new Map(buckets.map((b, i) => [b.key, i]))
  const put = (date: Date, field: 'spent' | 'earned', value: number) => {
    const i = slot.get(`${date.getFullYear()}-${date.getMonth()}`)
    if (i != null) buckets[i][field] += value
  }
  for (const e of expenses) put(e.date, 'spent', e.amount)
  for (const s of sales) put(s.date, 'earned', s.net)

  return buckets.map(({ month, spent, earned }) => ({ month, spent, earned }))
}

export async function expenseBreakdown(plotId: string) {
  const rows = await prisma.expense.groupBy({
    by: ['category'],
    where: { plotId, voided: false },
    _sum: { amount: true },
  })
  return rows.map((r) => ({ category: r.category, amount: r._sum.amount ?? 0 }))
}
