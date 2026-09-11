'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { nav } from '@/components/nav'

export function Sidebar() {
  const path = usePathname()
  return (
    <aside className="hidden w-[240px] shrink-0 border-r border-border bg-white lg:flex lg:flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-white">F</span>
        <div>
          <p className="text-sm font-semibold tracking-tight">FarmOS</p>
          <p className="text-xs text-muted-foreground">Farm admin</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {nav.map((item) => {
          const active = Boolean(
            path && (path === item.href || (item.href !== '/app/dashboard' && path.startsWith(item.href))),
          )
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href as '/app/dashboard'}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
                active ? 'bg-[#eeedff] font-medium text-primary' : 'text-[#425466] hover:bg-[#f6f9fc]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
