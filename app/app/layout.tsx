import { redirect } from 'next/navigation'
import { currentFarm } from '@/lib/context'
import { prisma } from '@/lib/prisma'
import { Shell } from '@/components/Shell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await currentFarm()
  if (!ctx?.session) redirect('/login')
  const plots = ctx.farm
    ? await prisma.plot.findMany({ where: { farmId: ctx.farm.id }, orderBy: { code: 'asc' } })
    : []
  return (
    <Shell
      farm={ctx.farm}
      farms={ctx.farms}
      plots={plots}
      userName={ctx.session.user.name ?? 'User'}
      userEmail={ctx.session.user.email ?? undefined}
      userRole={ctx.session.user.role}
    >
      {children}
    </Shell>
  )
}
