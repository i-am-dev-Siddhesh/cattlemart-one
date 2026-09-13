import { prisma } from '@/lib/prisma'
import { cycleFinance, farmFinance, monthFinance, monthlyMoney, plotFinance } from '@/lib/services/finance'
import { farmHealth } from '@/lib/services/health'

export async function dashboardData(farmId: string) {
  const farm = await prisma.farm.findUniqueOrThrow({ where: { id: farmId } })
  const plots = await prisma.plot.findMany({ where: { farmId }, orderBy: { code: 'asc' } })
  const cycles = await prisma.cropCycle.findMany({
    where: { plot: { farmId }, status: { notIn: ['completed', 'failed', 'abandoned'] } },
    include: { crop: true, plot: true },
  })
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(todayStart)
  todayEnd.setDate(todayEnd.getDate() + 1)

  const [
    finance,
    month,
    monthly,
    health,
    todayActs,
    recentActs,
    allCycles,
    tasks,
    harvests,
    alerts,
    inventory,
    expenses,
    sales,
    labour,
  ] = await Promise.all([
    farmFinance(farmId),
    monthFinance(farmId, new Date().getFullYear(), new Date().getMonth() + 1),
    monthlyMoney(farmId, 6),
    farmHealth(farmId),
    prisma.activity.findMany({
      where: { farmId, date: { gte: todayStart, lt: todayEnd } },
      include: { plot: true },
      take: 8,
    }),
    prisma.activity.findMany({
      where: { farmId },
      include: { plot: true },
      orderBy: { date: 'desc' },
      take: 40,
    }),
    prisma.cropCycle.findMany({
      where: { plot: { farmId } },
      include: { crop: true, plot: true },
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
      take: 12,
    }),
    prisma.task.findMany({
      where: { farmId, status: { in: ['planned', 'in_progress'] } },
      include: { plot: true },
      orderBy: { dueDate: 'asc' },
      take: 8,
    }),
    prisma.harvest.findMany({
      where: { plot: { farmId } },
      include: { plot: true, cropCycle: { include: { crop: true } } },
      orderBy: { date: 'desc' },
      take: 5,
    }),
    prisma.notification.findMany({
      where: { farmId, read: false },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.inventoryItem.findMany({ where: { farmId } }),
    prisma.expense.findMany({
      where: { farmId, voided: false },
      include: { plot: true },
      orderBy: { date: 'desc' },
      take: 80,
    }),
    prisma.sale.findMany({
      where: { farmId },
      include: { plot: true, cropCycle: { include: { crop: true } } },
      orderBy: { date: 'desc' },
      take: 80,
    }),
    prisma.labourRecord.findMany({
      where: { plot: { farmId } },
      include: { plot: true },
      orderBy: { date: 'desc' },
      take: 80,
    }),
  ])

  const plotCards = await Promise.all(
    plots.map(async (p) => {
      const money = await plotFinance(p.id)
      const cycle = cycles.find((c) => c.plotId === p.id)
      return { plot: p, money, cycle }
    }),
  )

  return {
    farm,
    plots,
    cycles,
    finance,
    month,
    monthly,
    health,
    todayActs,
    recentActs,
    allCycles,
    tasks,
    harvests,
    alerts,
    inventory,
    plotCards,
    expenses,
    sales,
    labour,
    area: plots.reduce((s, p) => s + p.acres, 0),
  }
}

export async function plotDetail(farmId: string, plotId: string) {
  const plot = await prisma.plot.findFirstOrThrow({
    where: { id: plotId, farmId },
    include: {
      farm: true,
      cycles: { include: { crop: true, variety: true }, orderBy: { year: 'desc' } },
      activities: { orderBy: { date: 'desc' }, take: 40 },
      expenses: { where: { voided: false }, orderBy: { date: 'desc' }, take: 40 },
      irrigations: { orderBy: { date: 'desc' }, take: 20 },
      pests: { orderBy: { date: 'desc' } },
      diseases: { orderBy: { date: 'desc' } },
      observations: { orderBy: { date: 'desc' } },
      soilTests: { orderBy: { date: 'desc' } },
      harvests: { include: { batches: true }, orderBy: { date: 'desc' } },
      sales: { include: { buyer: true }, orderBy: { date: 'desc' } },
      tasks: { orderBy: { dueDate: 'asc' } },
      documents: { orderBy: { createdAt: 'desc' } },
      labour: { orderBy: { date: 'desc' } },
    },
  })
  const current = plot.cycles.find((c) => !['completed', 'failed', 'abandoned'].includes(c.status))
  const money = await plotFinance(plot.id)
  const cycleMoney = current ? await cycleFinance(current.id) : null
  return { plot, current, money, cycleMoney }
}

export async function searchFarm(farmId: string, q: string) {
  const query = q.trim()
  if (query.length < 2) return { plots: [], activities: [], expenses: [], crops: [] }
  const [plots, activities, expenses, crops] = await Promise.all([
    prisma.plot.findMany({
      where: {
        farmId,
        OR: [{ name: { contains: query } }, { code: { contains: query } }],
      },
      take: 8,
    }),
    prisma.activity.findMany({
      where: {
        farmId,
        OR: [{ type: { contains: query } }, { description: { contains: query } }],
      },
      include: { plot: true },
      take: 8,
    }),
    prisma.expense.findMany({
      where: {
        farmId,
        voided: false,
        OR: [{ category: { contains: query } }, { notes: { contains: query } }],
      },
      include: { plot: true },
      take: 8,
    }),
    prisma.crop.findMany({
      where: { farmId, name: { contains: query } },
      take: 8,
    }),
  ])
  return { plots, activities, expenses, crops }
}
