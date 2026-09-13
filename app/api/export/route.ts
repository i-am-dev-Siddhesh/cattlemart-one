import { requireFarm } from '@/lib/access'
import { prisma } from '@/lib/prisma'
import { csvRow } from '@/lib/security'

const KINDS = new Set(['expenses', 'harvests', 'plots'])

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const farmId = searchParams.get('farmId')
  const kind = searchParams.get('kind') ?? 'expenses'
  if (!farmId) return new Response('farmId required', { status: 400 })
  if (!KINDS.has(kind)) return new Response('Unknown export', { status: 400 })
  try {
    await requireFarm(farmId)
  } catch {
    return new Response('Sign in required.', { status: 401 })
  }

  let csv = ''
  if (kind === 'expenses') {
    const rows = await prisma.expense.findMany({ where: { farmId, voided: false }, include: { plot: true } })
    csv = [csvRow(['date', 'plot', 'category', 'amount']), ...rows.map((r) => csvRow([r.date.toISOString(), r.plot?.name ?? '', r.category, r.amount]))].join('\n')
  } else if (kind === 'harvests') {
    const rows = await prisma.harvest.findMany({ where: { plot: { farmId } }, include: { plot: true } })
    csv = [csvRow(['date', 'plot', 'qty', 'unit']), ...rows.map((r) => csvRow([r.date.toISOString(), r.plot.name, r.quantity, r.unit]))].join('\n')
  } else {
    const rows = await prisma.plot.findMany({ where: { farmId } })
    csv = [csvRow(['code', 'name', 'acres', 'status']), ...rows.map((r) => csvRow([r.code, r.name, r.acres, r.status]))].join('\n')
  }

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${kind}.csv"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
