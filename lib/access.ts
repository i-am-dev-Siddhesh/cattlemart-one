import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function requireSession() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('You need to sign in.')
  }
  return session.user
}

export async function requireFarm(farmId: string) {
  const user = await requireSession()
  const farm = await prisma.farm.findFirst({
    where: {
      id: farmId,
      organizationId: user.organizationId,
    },
  })
  if (!farm) throw new Error('Farm not found or you do not have access.')
  return { user, farm }
}

export async function requirePlot(farmId: string, plotId: string) {
  const ctx = await requireFarm(farmId)
  const plot = await prisma.plot.findFirst({
    where: { id: plotId, farmId },
  })
  if (!plot) throw new Error('Plot not found.')
  return { ...ctx, plot }
}

export async function getDefaultFarm(organizationId: string) {
  return prisma.farm.findFirst({
    where: { organizationId },
    orderBy: { createdAt: 'asc' },
  })
}
