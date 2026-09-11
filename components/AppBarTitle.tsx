'use client'

import { usePathname } from 'next/navigation'
import { nav } from '@/components/nav'

function titleFor(path: string) {
  const segs = path.split('/').filter(Boolean)
  const plotIdx = segs.indexOf('plots')
  if (plotIdx >= 0 && segs[plotIdx + 1]) {
    const after = segs[plotIdx + 2]
    if (after === 'years' && segs[plotIdx + 3]) return `Year ${segs[plotIdx + 3]}`
    if (after === 'cycles' && segs[plotIdx + 3]) return 'Crop cycle'
    if (after === 'cycles' || after === 'history') return 'Cycles'
    return 'Plot'
  }
  if (path.includes('/map')) return 'Farm map'
  if (path.startsWith('/app/farms/') && path.endsWith('/plots')) return 'Plots'
  if (path === '/app/farms' || path === '/app/farms/') return 'Farms'
  if (path.match(/^\/app\/farms\/[^/]+$/)) return 'Farm'
  if (path.startsWith('/app/settings')) return 'Settings'
  if (path.startsWith('/app/compare')) return 'Season comparison'
  if (path.startsWith('/app/assistant')) return 'Assistant'
  const match = nav.find((item) => path === item.href || (item.href !== '/app/dashboard' && path.startsWith(item.href)))
  return match?.label ?? 'FarmOS'
}

export function AppBarTitle({ farmName }: { farmName?: string | null }) {
  const path = usePathname()
  return (
    <div>
      <p className="text-xs text-muted-foreground">{farmName || 'FarmOS'}</p>
      <h1 className="text-lg font-semibold tracking-tight">{titleFor(path ?? '')}</h1>
    </div>
  )
}
