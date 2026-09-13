import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export const FARM_COOKIE = 'farmos-farm'

export async function currentFarm() {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      organizationId: true,
      role: true,
      memberships: { select: { farmId: true } },
    },
  })
  if (!user) return null
  const jar = await cookies()
  const preferred = jar.get(FARM_COOKIE)?.value
  const memberIds = user.memberships.map((m) => m.farmId)
  const farms = await prisma.farm.findMany({
    where:
      user.role === 'owner'
        ? { organizationId: user.organizationId }
        : { organizationId: user.organizationId, id: { in: memberIds } },
    orderBy: { createdAt: 'asc' },
  })
  const farm = farms.find((f) => f.id === preferred) ?? farms[0] ?? null
  return {
    session: {
      ...session,
      user: {
        ...session.user,
        id: user.id,
        organizationId: user.organizationId,
        role: user.role,
        name: user.name,
        email: user.email,
      },
    },
    farms,
    farm,
  }
}
