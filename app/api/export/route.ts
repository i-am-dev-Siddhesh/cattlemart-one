import { requireFarm } from '@/lib/access'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const farmId = searchParams.get('farmId')
  const kind = searchParams.get('kind') ?? 'expenses'
  if (!farmId) return new Response('farmId required', { status: 400 })
  await requireFarm(farmId)

  let csv = ''
  if (kind === 'expenses') {
    const rows = await prisma.expense.findMany({ where: { farmId, voided: false }, include: { plot: true } })
    csv = ['date,plot,category,amount', ...rows.map((r) => `${r.date.toISOString()},${r.plot?.name ?? ''},${r.category},${r.amount}`)].join('\n')
  } else if (kind === 'harvests') {
    const rows = await prisma.harvest.findMany({ where: { plot: { farmId } }, include: { plot: true } })
    csv = ['date,plot,qty,unit', ...rows.map((r) => `${r.date.toISOString()},${r.plot.name},${r.quantity},${r.unit}`)].join('\n')
  } else {
    const rows = await prisma.plot.findMany({ where: { farmId } })
    csv = ['code,name,acres,status', ...rows.map((r) => `${r.code},${r.name},${r.acres},${r.status}`)].join('\n')
  }

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${kind}.csv"`,
    },
  })
}
