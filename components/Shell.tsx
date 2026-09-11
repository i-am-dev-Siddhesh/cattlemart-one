import { logoutAction } from '@/lib/actions'
import { AppBarTitle } from '@/components/AppBarTitle'
import { Sidebar } from '@/components/Sidebar'
import type { Farm, Plot } from '@prisma/client'

export function Shell({
  farm,
  farms,
  plots,
  userName,
  children,
}: {
  farm: Farm | null
  farms: Farm[]
  plots: Plot[]
  userName: string
  children: React.ReactNode
}) {
  void farms
  void plots
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-white px-6 py-4">
          <AppBarTitle farmName={farm?.name} />
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="hidden sm:inline">{[farm?.district, farm?.state].filter(Boolean).join(', ') || 'India'}</span>
            <form action={logoutAction}>
              <button className="rounded-full border border-border bg-white px-3 py-1.5 text-sm text-foreground">
                {userName}
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  )
}
