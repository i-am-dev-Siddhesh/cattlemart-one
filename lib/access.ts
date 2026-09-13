import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canWriteRole } from '@/lib/security'

export type AccessMode = 'read' | 'write' | 'manage'

function effectiveRole(orgRole: string, farmRole?: string | null) {
  if (orgRole === 'owner') return 'owner'
  return farmRole || orgRole
}

function assertMode(role: string, mode: AccessMode) {
  if (mode === 'read') return
  if (mode === 'manage' && role !== 'owner') {
    throw new Error('Only an owner can do that.')
  }
  if (mode === 'write' && !canWriteRole(role)) {
    throw new Error('You can view this farm but cannot change it.')
  }
}

export async function requireSession() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('You need to sign in.')
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      organizationId: true,
      role: true,
    },
  })
  if (!user) {
    throw new Error('Your login is out of date. Sign out and sign in again.')
  }
  return user
}

export async function requireFarm(farmId: string, mode: AccessMode = 'read') {
  const user = await requireSession()
  const farm = await prisma.farm.findFirst({
    where: {
      id: farmId,
      organizationId: user.organizationId,
    },
  })
  if (!farm) throw new Error('Farm not found or you do not have access.')

  const member = await prisma.farmMember.findFirst({
    where: { farmId: farm.id, userId: user.id },
    select: { role: true },
  })
  if (user.role !== 'owner' && !member) {
    throw new Error('Farm not found or you do not have access.')
  }

  const role = effectiveRole(user.role, member?.role)
  assertMode(role, mode)
  return { user: { ...user, role }, farm }
}

export async function requirePlot(farmId: string, plotId: string, mode: AccessMode = 'read') {
  const ctx = await requireFarm(farmId, mode)
  const plot = await prisma.plot.findFirst({
    where: { id: plotId, farmId: ctx.farm.id },
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
