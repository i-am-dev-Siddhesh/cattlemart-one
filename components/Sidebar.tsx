'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, LogOut } from 'lucide-react'
import { nav } from '@/components/nav'
import { ActionForm, SubmitButton } from '@/components/feedback'
import { logoutAction } from '@/lib/actions'

function isActive(path: string | null, href: string) {
  return Boolean(path && (path === href || (href !== '/app/dashboard' && path.startsWith(href))))
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const letters = parts.map((p) => p[0]).join('')
  return (letters || 'U').toUpperCase()
}

export function Sidebar({ userName, userEmail, userRole }: { userName: string; userEmail?: string; userRole?: string }) {
  const path = usePathname()
  return (
    <>
      <aside className="hidden w-[240px] shrink-0 border-r border-border bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-white">C</span>
          <div>
            <p className="text-sm font-semibold tracking-tight">Cattlemart One</p>
            <p className="text-xs text-muted-foreground">Farm admin</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {nav.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href as '/app/dashboard'}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
                  isActive(path, item.href) ? 'bg-[#eeedff] font-medium text-primary' : 'text-[#425466] hover:bg-[#f6f9fc]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="mt-4 border-t border-border p-3">
          <Link
            href="/app/profile"
            aria-label="Your profile"
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors ${
              isActive(path, '/app/profile') ? 'bg-[#eeedff]' : 'bg-[#f6f9fc] hover:bg-[#eeedff]'
            }`}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eeedff] text-xs font-bold text-primary">
              {initials(userName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">{userName}</p>
              <p className="truncate text-xs text-muted-foreground">{userEmail || userRole || 'Signed in'}</p>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
          <ActionForm action={logoutAction} ok="Signed out" className="mt-2">
            <SubmitButton
              variant="ghost"
              pendingLabel="Signing out…"
              className="h-10 w-full justify-start gap-2.5 px-3 text-sm font-medium text-[#425466] hover:bg-[#f6f9fc] hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </SubmitButton>
          </ActionForm>
        </div>
      </aside>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex gap-1 overflow-x-auto border-t border-border bg-white/95 px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur lg:hidden">
        {nav.map((item) => {
          const Icon = item.icon
          const active = isActive(path, item.href)
          return (
            <Link
              key={item.href}
              href={item.href as '/app/dashboard'}
              className={`flex min-w-[4.5rem] flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] ${
                active ? 'bg-[#eeedff] font-semibold text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
