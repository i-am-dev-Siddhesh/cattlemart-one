'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  ['overview', 'Overview'],
  ['crop', 'Crop'],
  ['activities', 'Activities'],
  ['expenses', 'Expenses'],
  ['inputs', 'Inputs'],
  ['irrigation', 'Irrigation'],
  ['health', 'Health'],
  ['soil', 'Soil'],
  ['labour', 'Labour'],
  ['harvest', 'Harvest'],
  ['sales', 'Sales'],
  ['cycles', 'Cycles'],
  ['documents', 'Documents'],
] as const

export function PlotTabs({ base }: { base: string }) {
  const path = usePathname() ?? ''
  return (
    <nav className="flex flex-wrap gap-4 border-b border-border">
      {tabs.map(([slug, label]) => {
        const href = slug === 'overview' ? base : `${base}/${slug}`
        const active =
          slug === 'overview'
            ? path === base
            : slug === 'cycles'
              ? path.includes('/cycles') || path.includes('/years') || path.endsWith('/history')
              : slug === 'crop'
                ? path === `${base}/crop` || path.startsWith(`${base}/crop/`)
                : path.startsWith(`${href}/`) || path === href
        return (
          <Link
            key={slug}
            href={href}
            className={`-mb-px border-b-2 pb-2.5 text-[13px] ${
              active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
