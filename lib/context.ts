import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export const FARM_COOKIE = 'farmos-farm'

export async function currentFarm() {
  const session = await auth()
  if (!session?.user) return null
  const jar = await cookies()
  const preferred = jar.get(FARM_COOKIE)?.value
  const farms = await prisma.farm.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { createdAt: 'asc' },
  })
  const farm = farms.find((f) => f.id === preferred) ?? farms[0] ?? null
  return { session, farms, farm }
}
