import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json([])
  if (q.length > 80) return NextResponse.json({ error: 'Search is too long.' }, { status: 400 })

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '6')
  url.searchParams.set('countrycodes', 'in')
  url.searchParams.set('addressdetails', '0')
  url.searchParams.set('q', q)

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'CattlemartOne/1.0 (farm map location search)',
      'Accept-Language': 'en-IN,en',
    },
    next: { revalidate: 120 },
  })
  if (!res.ok) return NextResponse.json({ error: 'Location search is unavailable.' }, { status: 502 })

  const rows = (await res.json()) as { display_name: string; lat: string; lon: string; boundingbox?: string[] }[]
  return NextResponse.json(
    Array.isArray(rows)
      ? rows.slice(0, 6).map((r) => ({
          label: r.display_name,
          lat: Number(r.lat),
          lng: Number(r.lon),
          bbox: r.boundingbox?.map(Number),
        }))
      : [],
    { headers: { 'Cache-Control': 'private, max-age=120' } },
  )
}
