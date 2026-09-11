import { prisma } from '@/lib/prisma'
import { farmFinance, plotFinance } from '@/lib/services/finance'
import { interpret, resolveDate } from '@/lib/services/interpret'
import { recordActivity, recordExpense } from '@/lib/services/activity'
import { inr } from '@/lib/utils'
import { cyclePeriod } from '@/lib/cycle-span'

async function findPlot(farmId: string, hint: string) {
  const code = hint.replace(/plot\s*/i, '').padStart(2, '0')
  return prisma.plot.findFirst({
    where: {
      farmId,
      OR: [{ code: { contains: code } }, { name: { contains: hint } }],
    },
  })
}

export async function answerQuestion(farmId: string, text: string) {
  const t = text.toLowerCase()
  const plot = await findPlot(farmId, text.match(/plot\s*0?\d+/i)?.[0] ?? '')

  if (/how much.*spent|cost this season|spent on plot/i.test(t) && plot) {
    const m = await plotFinance(plot.id)
    return `${plot.name} expenses from recorded books: ${inr(m.expenses)}. Revenue ${inr(m.revenue)}. Profit ${inr(m.profit)}. These are actuals only.`
  }

  if (/fertilizer.*last month|what fertilizer/i.test(t)) {
    const start = new Date()
    start.setMonth(start.getMonth() - 1)
    const apps = await prisma.fertilizerApplication.findMany({
      where: { cropCycle: { plot: { farmId } }, date: { gte: start } },
      include: { cropCycle: { include: { plot: true, crop: true } } },
    })
    if (!apps.length) return 'No fertilizer applications are recorded for the last month.'
    return apps
      .map((a) => `${a.cropCycle.plot.name}: ${a.quantity} ${a.unit} ${a.product}`)
      .join('\n')
  }

  if (/planted here last year|grow here last year/i.test(t) && plot) {
    const last = await prisma.cropCycle.findFirst({
      where: { plotId: plot.id, year: new Date().getFullYear() - 1 },
      include: { crop: true },
    })
    if (!last) return `No crop cycle is stored for ${plot.name} last year.`
    return `${plot.name}: ${last.crop.name} (${cyclePeriod(last)}), status ${last.status}.`
  }

  if (/disease/i.test(t) && plot) {
    const rows = await prisma.diseaseObservation.findMany({
      where: { plotId: plot.id },
      orderBy: { date: 'desc' },
    })
    if (!rows.length) return `No disease observations are stored for ${plot.name}.`
    return rows.map((d) => `${d.date.toDateString()}: ${d.disease} (${d.severity})`).join('\n')
  }

  if (/labour cost for tomato/i.test(t)) {
    const sum = await prisma.expense.aggregate({
      where: {
        farmId,
        voided: false,
        category: 'labour',
        cropCycle: { crop: { name: { contains: 'Tomato' } } },
      },
      _sum: { amount: true },
    })
    return `Recorded tomato labour: ${inr(sum._sum.amount ?? 0)}.`
  }

  if (/most profitable/i.test(t)) {
    const plots = await prisma.plot.findMany({ where: { farmId } })
    const scored = await Promise.all(
      plots.map(async (p) => ({ p, m: await plotFinance(p.id) })),
    )
    scored.sort((a, b) => b.m.profit - a.m.profit)
    const top = scored[0]
    if (!top) return 'No plots found.'
    return `${top.p.name} has the highest recorded profit: ${inr(top.m.profit)}.`
  }

  if (/npk is left|how much npk/i.test(t)) {
    const item = await prisma.inventoryItem.findFirst({
      where: { farmId, name: { contains: 'NPK' } },
    })
    if (!item) return 'No NPK inventory item exists.'
    return `${item.name}: ${item.qtyOnHand} ${item.unit} on hand (from inventory transactions).`
  }

  if (/expenses this month/i.test(t)) {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const sum = await prisma.expense.aggregate({
      where: { farmId, voided: false, date: { gte: start } },
      _sum: { amount: true },
    })
    return `This month's recorded expenses: ${inr(sum._sum.amount ?? 0)}.`
  }

  if (/compare tomato/i.test(t)) {
    const cycles = await prisma.cropCycle.findMany({
      where: { plot: { farmId }, crop: { name: { contains: 'Tomato' } } },
      include: { plot: true, crop: true },
    })
    if (!cycles.length) return 'No tomato cycles are stored.'
    const lines = []
    for (const c of cycles) {
      const m = await plotFinance(c.plotId)
      lines.push(`${c.plot.name} ${c.year}: expenses ${inr(m.expenses)}, revenue ${inr(m.revenue)}`)
    }
    return lines.join('\n')
  }

  if (/did in plot|this month/i.test(t) && plot) {
    const start = new Date()
    start.setDate(1)
    const acts = await prisma.activity.findMany({
      where: { plotId: plot.id, date: { gte: start } },
      orderBy: { date: 'asc' },
    })
    if (!acts.length) return `No activities recorded on ${plot.name} this month.`
    return acts.map((a) => `${a.date.toDateString()}: ${a.type}${a.description ? ` — ${a.description}` : ''}`).join('\n')
  }

  const farm = await farmFinance(farmId)
  return `I can only answer from stored records. Farm totals: expenses ${inr(farm.expenses)}, revenue ${inr(farm.revenue)}. Ask about a named plot, fertilizer, disease, labour, or inventory.`
}

export async function confirmParsed(farmId: string, userId: string, text: string) {
  const parsed = interpret(text)
  if (parsed.kind === 'unknown') return { parsed, saved: null as null }
  if (parsed.kind === 'question') {
    const answer = await answerQuestion(farmId, parsed.topic)
    return { parsed, saved: null, answer }
  }
  const plot = await findPlot(farmId, parsed.plotHint)
  if (!plot) return { parsed, saved: null, error: `No plot matched “${parsed.plotHint}”.` }
  const date = resolveDate(parsed.dateHint)

  if (parsed.kind === 'expense') {
    const saved = await recordExpense({
      farmId,
      plotId: plot.id,
      category: parsed.category,
      date,
      amount: parsed.amount,
      notes: parsed.product,
      userId,
    })
    return { parsed, saved }
  }

  const saved = await recordActivity({
    farmId,
    plotId: plot.id,
    type: parsed.type,
    date,
    userId,
    inputName: parsed.product,
    inputQty: parsed.qty,
    inputUnit: 'kg',
    inputCost: parsed.amount,
    expenseCategory: 'fertilizer',
  })
  return { parsed, saved }
}
