import Link from 'next/link'
import { AppBarTitle } from '@/components/AppBarTitle'
import { FarmContextBar } from '@/components/FarmContextBar'
import { Sidebar } from '@/components/Sidebar'
import type { Farm, Plot } from '@prisma/client'

export function Shell({
  farm,
  farms,
  plots,
  userName,
  userEmail,
  userRole,
  children,
}: {
  farm: Farm | null
  farms: Farm[]
  plots: Plot[]
  userName: string
  userEmail?: string
  userRole?: string
  children: React.ReactNode
}) {
  void plots
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userName={userName} userEmail={userEmail} userRole={userRole} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-white px-4 py-3 sm:px-6 sm:py-4">
          <AppBarTitle farmName={farm?.name} farms={farms} currentId={farm?.id} />
          <div className="flex min-w-0 items-center gap-3 text-sm text-muted-foreground">
            <FarmContextBar
              currentId={farm?.id}
              farms={farms.map((f) => ({
                id: f.id,
                name: f.name,
                village: f.village,
                district: f.district,
                state: f.state,
                country: f.country,
              }))}
            />
            <Link
              href="/app/profile"
              className="rounded-full border border-border bg-white px-3 py-1.5 text-sm text-foreground lg:hidden"
            >
              {userName}
            </Link>
          </div>
        </header>
        <main className="flex-1 px-4 py-4 pb-24 sm:px-6 sm:py-6 lg:pb-6">{children}</main>
      </div>
    </div>
  )
}
