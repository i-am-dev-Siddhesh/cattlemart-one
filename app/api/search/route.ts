import { NextResponse } from 'next/server'
import { requireFarm } from '@/lib/access'
import { searchFarm } from '@/lib/queries'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const farmId = searchParams.get('farmId')
  const q = (searchParams.get('q') ?? '').slice(0, 80)
  if (!farmId) return NextResponse.json({ error: 'farmId required' }, { status: 400 })
  try {
    await requireFarm(farmId)
    const data = await searchFarm(farmId, q)
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  }
}
