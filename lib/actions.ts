'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { auth, signIn, signOut } from '@/lib/auth'
import { requireFarm, requirePlot, requireSession } from '@/lib/access'
import { prisma } from '@/lib/prisma'
import { recordActivity, recordExpense } from '@/lib/services/activity'
import { confirmParsed } from '@/lib/services/assistant'
import { envelopeRing, farmWorkingRing, polygonFromRing, ringAreaAcres, ringInsideFarm, ringPerimeterM, type LatLng } from '@/lib/geo'
import { parseCycleRange } from '@/lib/cycle-span'

async function actor() {
  const user = await requireSession()
  return user
}

export async function loginAction(formData: FormData) {
  await signIn('credentials', {
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
    redirectTo: '/app/dashboard',
  })
}

export async function logoutAction() {
  await signOut({ redirectTo: '/login' })
}

const activitySchema = z.object({
  farmId: z.string(),
  plotId: z.string(),
  type: z.string().min(2),
  date: z.string(),
  description: z.string().optional(),
  labourWorkers: z.coerce.number().optional(),
  labourRate: z.coerce.number().optional(),
  inputName: z.string().optional(),
  inputQty: z.coerce.number().optional(),
  inputCost: z.coerce.number().optional(),
  expenseCategory: z.string().optional(),
})

export async function createActivityAction(input: z.infer<typeof activitySchema>) {
  const parsed = activitySchema.parse(input)
  const { user } = await requireFarm(parsed.farmId)
  await requirePlot(parsed.farmId, parsed.plotId)
  await recordActivity({
    ...parsed,
    date: new Date(parsed.date),
    userId: user.id,
  })
  revalidatePath('/app', 'layout')
}

export async function createExpenseAction(input: {
  farmId: string
  plotId?: string
  category: string
  date: string
  amount: number
  quantity?: number
  unit?: string
  notes?: string
}) {
  const { user } = await requireFarm(input.farmId)
  await recordExpense({
    farmId: input.farmId,
    plotId: input.plotId,
    category: input.category,
    date: new Date(input.date),
    amount: input.amount,
    quantity: input.quantity,
    unit: input.unit,
    notes: input.notes,
    userId: user.id,
  })
  revalidatePath('/app', 'layout')
}

export async function createPlotAction(input: {
  farmId: string
  name: string
  code: string
  ring: LatLng[]
  irrigation?: string
  soilType?: string
  cropId?: string
  leaveUnplanted?: boolean
  startDate?: string
  endDate?: string
}) {
  const { farm } = await requireFarm(input.farmId)
  if (input.ring.length < 3) throw new Error('Draw a plot boundary with at least 3 points.')
  const siblings = await prisma.plot.findMany({ where: { farmId: farm.id }, select: { geoJson: true } })
  const farmRing = farmWorkingRing(farm, siblings)
  if (farmRing.length >= 3 && !ringInsideFarm(input.ring, farmRing)) {
    const expanded = envelopeRing([...farmRing, ...input.ring], 0.002)
    const mid = input.ring[0]
    await prisma.farm.update({
      where: { id: farm.id },
      data: {
        geoJson: JSON.stringify(polygonFromRing(expanded)),
        lat: mid.lat,
        lng: mid.lng,
      },
    })
  }
  if (input.cropId) {
    const crop = await prisma.crop.findFirst({ where: { id: input.cropId, farmId: farm.id } })
    if (!crop) throw new Error('That crop does not belong to this farm.')
  }
  const acres = ringAreaAcres(input.ring)
  const geo = polygonFromRing(input.ring)
  const plot = await prisma.plot.create({
    data: {
      farmId: farm.id,
      name: input.name,
      code: input.code,
      acres,
      irrigation: input.irrigation,
      soilType: input.soilType,
      geoJson: JSON.stringify(geo),
      perimeterM: ringPerimeterM(input.ring),
      status: input.leaveUnplanted || !input.cropId ? 'fallow' : 'planned',
    },
  })
  if (input.cropId && !input.leaveUnplanted) {
    const range = parseCycleRange(
      input.startDate || new Date().toISOString().slice(0, 10),
      input.endDate || new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10),
    )
    await prisma.cropCycle.create({
      data: {
        plotId: plot.id,
        cropId: input.cropId,
        season: range.season,
        year: range.year,
        startDate: range.start,
        endDate: range.end,
        plantingDate: range.start,
        expectedHarvest: range.end,
        status: 'planned',
      },
    })
  }
  revalidatePath('/app', 'layout')
  return plot.id
}

export async function plantNewCycleAction(input: {
  farmId: string
  plotId: string
  cropId: string
  startDate: string
  endDate: string
}) {
  await requirePlot(input.farmId, input.plotId)
  const crop = await prisma.crop.findFirst({ where: { id: input.cropId, farmId: input.farmId } })
  if (!crop) throw new Error('That crop does not belong to this farm.')
  const range = parseCycleRange(input.startDate, input.endDate)
  const open = await prisma.cropCycle.findMany({
    where: {
      plotId: input.plotId,
      status: { notIn: ['completed', 'failed', 'abandoned'] },
    },
  })
  await prisma.$transaction([
    ...open.map((c) =>
      prisma.cropCycle.update({
        where: { id: c.id },
        data: { status: 'completed', endDate: c.endDate ?? range.start },
      }),
    ),
    prisma.cropCycle.create({
      data: {
        plotId: input.plotId,
        cropId: input.cropId,
        season: range.season,
        year: range.year,
        startDate: range.start,
        endDate: range.end,
        plantingDate: range.start,
        expectedHarvest: range.end,
        status: 'planned',
      },
    }),
    prisma.plot.update({
      where: { id: input.plotId },
      data: { status: 'planned' },
    }),
  ])
  revalidatePath('/app', 'layout')
}

export async function createTaskAction(input: {
  farmId: string
  plotId?: string
  title: string
  dueDate?: string
  priority?: string
}) {
  await requireFarm(input.farmId)
  await prisma.task.create({
    data: {
      farmId: input.farmId,
      plotId: input.plotId,
      title: input.title,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      priority: input.priority ?? 'normal',
    },
  })
  revalidatePath('/app', 'layout')
}

export async function completeTaskAsActivityAction(taskId: string, activityType: string) {
  const user = await actor()
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } })
  await requireFarm(task.farmId)
  if (!task.plotId) throw new Error('Assign the task to a plot first.')
  await recordActivity({
    farmId: task.farmId,
    plotId: task.plotId,
    type: activityType,
    date: new Date(),
    description: task.title,
    userId: user.id,
  })
  await prisma.task.update({ where: { id: taskId }, data: { status: 'completed' } })
  revalidatePath('/app', 'layout')
}

export async function createObservationAction(input: {
  farmId: string
  plotId: string
  kind: 'crop' | 'pest' | 'disease'
  date: string
  note: string
  name?: string
  severity: string
}) {
  await requirePlot(input.farmId, input.plotId)
  const cycle = await prisma.cropCycle.findFirst({
    where: { plotId: input.plotId, status: { notIn: ['completed', 'failed', 'abandoned'] } },
  })
  const date = new Date(input.date)
  if (input.kind === 'pest') {
    await prisma.pestObservation.create({
      data: {
        plotId: input.plotId,
        cropCycleId: cycle?.id,
        date,
        pest: input.name ?? 'Unspecified',
        severity: input.severity,
        notes: input.note,
      },
    })
  } else if (input.kind === 'disease') {
    await prisma.diseaseObservation.create({
      data: {
        plotId: input.plotId,
        cropCycleId: cycle?.id,
        date,
        disease: input.name ?? 'Unspecified',
        severity: input.severity,
        notes: input.note,
      },
    })
  } else {
    await prisma.cropObservation.create({
      data: {
        plotId: input.plotId,
        cropCycleId: cycle?.id,
        date,
        severity: input.severity,
        note: input.note,
      },
    })
  }
  revalidatePath('/app', 'layout')
}

export async function createIrrigationAction(input: {
  farmId: string
  plotId: string
  date: string
  method?: string
  quantityL?: number
  cost?: number
}) {
  const { user } = await requirePlot(input.farmId, input.plotId)
  const cycle = await prisma.cropCycle.findFirst({
    where: { plotId: input.plotId, status: { notIn: ['completed', 'failed', 'abandoned'] } },
  })
  const date = new Date(input.date)
  const activity = await recordActivity({
    farmId: input.farmId,
    plotId: input.plotId,
    cropCycleId: cycle?.id,
    type: 'Irrigation',
    date,
    description: input.quantityL ? `${input.quantityL} L` : undefined,
    inputCost: input.cost,
    expenseCategory: input.cost ? 'irrigation' : undefined,
    userId: user.id,
  })
  await prisma.irrigationRecord.create({
    data: {
      plotId: input.plotId,
      cropCycleId: cycle?.id,
      activityId: activity.id,
      date,
      method: input.method,
      quantityL: input.quantityL,
      cost: input.cost,
    },
  })
  revalidatePath('/app', 'layout')
}

export async function createHarvestAction(input: {
  farmId: string
  plotId: string
  date: string
  quantity: number
  unit: string
}) {
  await requirePlot(input.farmId, input.plotId)
  const cycle = await prisma.cropCycle.findFirst({
    where: { plotId: input.plotId, status: { notIn: ['completed', 'failed', 'abandoned'] } },
  })
  if (!cycle) throw new Error('Plant a crop cycle before recording harvest.')
  await prisma.harvest.create({
    data: {
      plotId: input.plotId,
      cropCycleId: cycle.id,
      date: new Date(input.date),
      quantity: input.quantity,
      unit: input.unit,
      marketableQty: input.quantity,
    },
  })
  revalidatePath('/app', 'layout')
}

export async function createSaleAction(input: {
  farmId: string
  plotId: string
  date: string
  quantity: number
  unit: string
  unitPrice: number
}) {
  await requirePlot(input.farmId, input.plotId)
  const cycle = await prisma.cropCycle.findFirst({
    where: { plotId: input.plotId, status: { notIn: ['completed', 'failed', 'abandoned'] } },
  })
  const gross = input.quantity * input.unitPrice
  await prisma.sale.create({
    data: {
      farmId: input.farmId,
      plotId: input.plotId,
      cropCycleId: cycle?.id,
      date: new Date(input.date),
      quantity: input.quantity,
      unit: input.unit,
      unitPrice: input.unitPrice,
      gross,
      net: gross,
    },
  })
  revalidatePath('/app', 'layout')
}

export async function assistantConfirmAction(farmId: string, text: string) {
  const { user } = await requireFarm(farmId)
  const result = await confirmParsed(farmId, user.id, text)
  revalidatePath('/app', 'layout')
  return result
}

export async function setFarmLocationAction(input: {
  farmId: string
  lat: number
  lng: number
  label?: string
  ring?: LatLng[]
}) {
  const { farm } = await requireFarm(input.farmId)
  const outline = input.ring && input.ring.length >= 3 ? input.ring : envelopeRing([{ lat: input.lat, lng: input.lng }], 0.008)
  await prisma.farm.update({
    where: { id: farm.id },
    data: {
      lat: input.lat,
      lng: input.lng,
      geoJson: JSON.stringify(polygonFromRing(outline)),
      village: input.label ? input.label.split(',')[0]?.trim() : farm.village,
    },
  })
}

export async function createFarmAction(input: { name: string; village?: string; season?: string }) {
  const user = await actor()
  const farm = await prisma.farm.create({
    data: {
      organizationId: user.organizationId,
      name: input.name,
      village: input.village,
      season: input.season ?? 'Kharif 2026',
    },
  })
  await prisma.farmMember.create({
    data: { farmId: farm.id, userId: user.id, role: user.role },
  })
  revalidatePath('/app', 'layout')
  return farm.id
}

export async function updatePlotAction(input: {
  farmId: string
  plotId: string
  name: string
  code: string
  acres: number
  status: string
}) {
  await requirePlot(input.farmId, input.plotId)
  await prisma.plot.update({
    where: { id: input.plotId },
    data: {
      name: input.name,
      code: input.code,
      acres: input.acres,
      status: input.status,
    },
  })
  revalidatePath('/app', 'layout')
}

export async function createSimplePlotAction(_input: {
  farmId: string
  name: string
  code: string
  acres: number
}) {
  throw new Error('Draw the plot boundary on this farm’s map. A plot belongs to one farm only.')
}
