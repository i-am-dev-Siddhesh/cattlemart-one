'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { auth, signIn, signOut } from '@/lib/auth'
import { requireFarm, requirePlot, requireSession } from '@/lib/access'
import { prisma } from '@/lib/prisma'
import { recordActivity, recordExpense, voidExpense } from '@/lib/services/activity'
import { confirmParsed } from '@/lib/services/assistant'
import {
  overlappingPlots,
  parseRingJson,
  polygonFromRing,
  ringAreaAcres,
  ringInsideFarm,
  ringPerimeterM,
  type LatLng,
} from '@/lib/geo'
import { parseCycleRange } from '@/lib/cycle-span'
import { parseDay, seasonWindow, weatherSeason } from '@/lib/farm-season'
import { selectFarmAction } from '@/lib/farm-cookie'
import { isPoiName, reversePlace, searchPlace } from '@/lib/geocode'
import { runAction } from '@/lib/action-result'
import { isNextNavigationError } from '@/lib/utils'
import {
  assertLoginAllowed,
  assertMoney,
  assertOptionalMoney,
  assertPasswordStrength,
  assertQuantity,
  canWriteRole,
  clearLoginHits,
  normalizeEmail,
} from '@/lib/security'

async function actor() {
  return requireSession()
}

export async function loginAction(formData: FormData) { return runAction(async () => {
  const email = normalizeEmail(String(formData.get('email') ?? ''))
  try {
    assertLoginAllowed(email)
    await signIn('credentials', {
      email,
      password: String(formData.get('password') ?? ''),
      redirectTo: '/app/dashboard',
    })
    clearLoginHits(email)
  } catch (err) {
    if (isNextNavigationError(err)) {
      clearLoginHits(email)
      throw err
    }
    throw err
  }
})}

export async function logoutAction() { return runAction(async () => {
  await signOut({ redirectTo: '/login' })
})}

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

export async function createActivityAction(input: z.infer<typeof activitySchema>) { return runAction(async () => {
  const parsed = activitySchema.parse(input)
  const { user } = await requirePlot(parsed.farmId, parsed.plotId, 'write')
  assertOptionalMoney(parsed.inputCost, 'Input cost')
  assertOptionalMoney(parsed.labourRate, 'Labour rate')
  await recordActivity({
    ...parsed,
    date: new Date(parsed.date),
    userId: user.id,
  })
  revalidatePath('/app', 'layout')
})}

export async function createExpenseAction(input: {
  farmId: string
  plotId: string
  category: string
  date: string
  amount: number
  quantity?: number
  unit?: string
  notes?: string
}) { return runAction(async () => {
  const { user } = await requirePlot(input.farmId, input.plotId, 'write')
  assertMoney(input.amount)
  assertOptionalMoney(input.quantity, 'Quantity')
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
})}

export async function deleteExpenseAction(input: { farmId: string; expenseId: string }) { return runAction(async () => {
  const { user } = await requireFarm(input.farmId, 'write')
  const expense = await prisma.expense.findFirst({
    where: { id: input.expenseId, farmId: input.farmId, voided: false },
    select: { id: true },
  })
  if (!expense) throw new Error('Expense not found or already deleted.')
  await voidExpense(expense.id, user.id, 'Deleted from expense ledger')
  revalidatePath('/app', 'layout')
})}

export async function deleteExpensesAction(input: { farmId: string; expenseIds: string[] }) { return runAction(async () => {
  const { user } = await requireFarm(input.farmId, 'write')
  const ids = [...new Set(input.expenseIds)].filter(Boolean)
  if (!ids.length) throw new Error('No expenses selected.')

  const expenses = await prisma.expense.findMany({
    where: { farmId: input.farmId, id: { in: ids }, voided: false },
    select: { id: true, amount: true, category: true },
  })
  if (!expenses.length) throw new Error('No active expenses found.')

  await prisma.$transaction([
    prisma.expense.updateMany({
      where: { farmId: input.farmId, id: { in: expenses.map((expense) => expense.id) }, voided: false },
      data: { voided: true },
    }),
    prisma.auditLog.createMany({
      data: expenses.map((expense) => ({
        userId: user.id,
        action: 'void',
        entity: 'Expense',
        entityId: expense.id,
        previous: JSON.stringify({ amount: expense.amount, category: expense.category }),
        reason: 'Bulk deleted from expense ledger',
      })),
    }),
  ])
  revalidatePath('/app', 'layout')
})}

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
}) { return runAction(async () => {
  const { farm } = await requireFarm(input.farmId, 'write')
  if (input.ring.length < 3) throw new Error('Draw a plot boundary with at least 3 points.')
  const siblings = await prisma.plot.findMany({
    where: { farmId: farm.id },
    select: { id: true, name: true, geoJson: true },
  })
  const clash = overlappingPlots(input.ring, siblings)
  if (clash.length) {
    throw new Error(
      `This shape sits on top of ${clash.map((p) => p.name).join(', ')}. Draw it on open land, or edit that plot instead.`,
    )
  }
  const duplicateCode = siblings.length
    ? await prisma.plot.findFirst({ where: { farmId: farm.id, code: input.code } })
    : null
  if (duplicateCode) throw new Error(`Plot code ${input.code} is already used by ${duplicateCode.name}.`)
  const farmRing = parseRingJson(farm.geoJson)
  if (farmRing.length < 3) throw new Error('Save the farm boundary before drawing a plot.')
  if (!ringInsideFarm(input.ring, farmRing)) {
    throw new Error('The whole plot must stay inside the saved farm boundary.')
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
})}

export async function updatePlotShapeAction(input: {
  farmId: string
  plotId: string
  name: string
  code: string
  ring: LatLng[]
  irrigation?: string
  soilType?: string
  status?: string
}) { return runAction(async () => {
  const { farm } = await requirePlot(input.farmId, input.plotId, 'write')
  if (input.ring.length < 3) throw new Error('A plot needs at least 3 corners.')
  const farmRing = parseRingJson(farm.geoJson)
  if (farmRing.length < 3) throw new Error('Save the farm boundary before editing a plot.')
  if (!ringInsideFarm(input.ring, farmRing)) {
    throw new Error('The whole plot must stay inside the saved farm boundary.')
  }
  const others = await prisma.plot.findMany({
    where: { farmId: farm.id, id: { not: input.plotId } },
    select: { id: true, name: true, code: true, geoJson: true },
  })
  const clash = overlappingPlots(input.ring, others)
  if (clash.length) {
    throw new Error(`This shape sits on top of ${clash.map((p) => p.name).join(', ')}. Move it off that plot.`)
  }
  if (others.some((p) => p.code === input.code)) {
    throw new Error(`Plot code ${input.code} is already used on this farm.`)
  }
  await prisma.plot.update({
    where: { id: input.plotId },
    data: {
      name: input.name,
      code: input.code,
      acres: ringAreaAcres(input.ring),
      geoJson: JSON.stringify(polygonFromRing(input.ring)),
      perimeterM: ringPerimeterM(input.ring),
      irrigation: input.irrigation || null,
      soilType: input.soilType || null,
      status: input.status || undefined,
    },
  })
  revalidatePath('/app', 'layout')
})}

export async function deletePlotAction(input: { farmId: string; plotId: string }) { return runAction(async () => {
  await requirePlot(input.farmId, input.plotId, 'manage')
  const cycles = await prisma.cropCycle.findMany({ where: { plotId: input.plotId }, select: { id: true } })
  const cycleIds = cycles.map((c) => c.id)
  const acts = await prisma.activity.findMany({ where: { plotId: input.plotId }, select: { id: true } })
  const actIds = acts.map((a) => a.id)
  await prisma.$transaction(async (tx) => {
    await tx.expense.updateMany({
      where: { OR: [{ plotId: input.plotId }, { cropCycleId: { in: cycleIds } }, { activityId: { in: actIds } }] },
      data: { plotId: null, cropCycleId: null, activityId: null },
    })
    await tx.sale.updateMany({
      where: { OR: [{ plotId: input.plotId }, { cropCycleId: { in: cycleIds } }] },
      data: { plotId: null, cropCycleId: null, harvestId: null },
    })
    await tx.labourRecord.updateMany({
      where: { OR: [{ plotId: input.plotId }, { cropCycleId: { in: cycleIds } }, { activityId: { in: actIds } }] },
      data: { plotId: null, cropCycleId: null, activityId: null },
    })
    await tx.task.updateMany({ where: { plotId: input.plotId }, data: { plotId: null } })
    await tx.document.updateMany({ where: { plotId: input.plotId }, data: { plotId: null } })
    await tx.irrigationRecord.updateMany({
      where: { OR: [{ plotId: input.plotId }, { cropCycleId: { in: cycleIds } }] },
      data: { cropCycleId: null, activityId: null },
    })
    await tx.activity.updateMany({ where: { plotId: input.plotId }, data: { cropCycleId: null } })
    await tx.cropObservation.updateMany({ where: { plotId: input.plotId }, data: { cropCycleId: null } })
    await tx.pestObservation.updateMany({ where: { plotId: input.plotId }, data: { cropCycleId: null } })
    await tx.diseaseObservation.updateMany({ where: { plotId: input.plotId }, data: { cropCycleId: null } })
    await tx.plot.delete({ where: { id: input.plotId } })
  })
  revalidatePath('/app', 'layout')
})}

export async function plantNewCycleAction(input: {
  farmId: string
  plotId: string
  cropId: string
  startDate: string
  endDate: string
}) { return runAction(async () => {
  await requirePlot(input.farmId, input.plotId, 'write')
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
})}

function cleanCropName(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

async function assertCropNameFree(farmId: string, name: string, exceptId?: string) {
  const rows = await prisma.crop.findMany({
    where: { farmId },
    select: { id: true, name: true },
  })
  const clash = rows.find((row) => row.name.toLowerCase() === name.toLowerCase() && row.id !== exceptId)
  if (clash) throw new Error(`${clash.name} is already on this farm.`)
}

export async function createCropAction(input: {
  farmId: string
  name: string
  localName?: string
  scientificName?: string
}) { return runAction(async () => {
  const { farm } = await requireFarm(input.farmId, 'write')
  const name = cleanCropName(input.name)
  if (!name) throw new Error('Crop name is required.')
  await assertCropNameFree(farm.id, name)
  const crop = await prisma.crop.create({
    data: {
      farmId: farm.id,
      name,
      localName: cleanCropName(input.localName ?? '') || null,
      scientificName: cleanCropName(input.scientificName ?? '') || null,
    },
  })
  revalidatePath('/app', 'layout')
  return { id: crop.id, name: crop.name, localName: crop.localName, scientificName: crop.scientificName }
})}

export async function updateCropAction(input: {
  farmId: string
  cropId: string
  name: string
  localName?: string
  scientificName?: string
}) { return runAction(async () => {
  const { farm } = await requireFarm(input.farmId, 'write')
  const crop = await prisma.crop.findFirst({ where: { id: input.cropId, farmId: farm.id } })
  if (!crop) throw new Error('That crop was not found on this farm.')
  const name = cleanCropName(input.name)
  if (!name) throw new Error('Crop name is required.')
  await assertCropNameFree(farm.id, name, crop.id)
  await prisma.crop.update({
    where: { id: crop.id },
    data: {
      name,
      localName: cleanCropName(input.localName ?? '') || null,
      scientificName: cleanCropName(input.scientificName ?? '') || null,
    },
  })
  revalidatePath('/app', 'layout')
})}

export async function deleteCropAction(input: { farmId: string; cropId: string }) { return runAction(async () => {
  const { farm } = await requireFarm(input.farmId, 'manage')
  const crop = await prisma.crop.findFirst({
    where: { id: input.cropId, farmId: farm.id },
    include: { _count: { select: { cycles: true } } },
  })
  if (!crop) throw new Error('That crop was not found on this farm.')
  if (crop._count.cycles) {
    throw new Error(
      `${crop.name} is planted on ${crop._count.cycles} cycle${crop._count.cycles === 1 ? '' : 's'}. Finish or remove those first.`,
    )
  }
  await prisma.crop.delete({ where: { id: crop.id } })
  revalidatePath('/app', 'layout')
})}

export async function createTaskAction(input: {
  farmId: string
  plotId?: string
  title: string
  dueDate?: string
  priority?: string
}) { return runAction(async () => {
  await requireFarm(input.farmId, 'write')
  if (input.plotId) await requirePlot(input.farmId, input.plotId, 'write')
  const title = input.title.trim()
  if (!title) throw new Error('Task title is required.')
  await prisma.task.create({
    data: {
      farmId: input.farmId,
      plotId: input.plotId,
      title,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      priority: input.priority ?? 'normal',
    },
  })
  revalidatePath('/app', 'layout')
})}

export async function completeTaskAsActivityAction(taskId: string, activityType: string) { return runAction(async () => {
  const user = await actor()
  const task = await prisma.task.findFirst({ where: { id: taskId } })
  if (!task) throw new Error('Task not found.')
  await requireFarm(task.farmId, 'write')
  if (!task.plotId) throw new Error('Assign the task to a plot first.')
  await requirePlot(task.farmId, task.plotId, 'write')
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
})}

export async function createObservationAction(input: {
  farmId: string
  plotId: string
  kind: 'crop' | 'pest' | 'disease'
  date: string
  note: string
  name?: string
  severity: string
}) { return runAction(async () => {
  await requirePlot(input.farmId, input.plotId, 'write')
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
})}

export async function createIrrigationAction(input: {
  farmId: string
  plotId: string
  date: string
  method?: string
  quantityL?: number
  cost?: number
}) { return runAction(async () => {
  const { user } = await requirePlot(input.farmId, input.plotId, 'write')
  assertOptionalMoney(input.cost, 'Irrigation cost')
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
})}

export async function createHarvestAction(input: {
  farmId: string
  plotId: string
  date: string
  quantity: number
  unit: string
}) { return runAction(async () => {
  await requirePlot(input.farmId, input.plotId, 'write')
  assertQuantity(input.quantity)
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
})}

export async function createSaleAction(input: {
  farmId: string
  plotId: string
  cropId?: string
  date: string
  quantity: number
  unit: string
  unitPrice: number
  notes?: string
}) { return runAction(async () => {
  await requirePlot(input.farmId, input.plotId, 'write')
  assertQuantity(input.quantity)
  assertMoney(input.unitPrice, 'Unit price')
  const crop = input.cropId
    ? await prisma.crop.findFirst({ where: { id: input.cropId, farmId: input.farmId } })
    : null
  const cycle = crop
    ? await prisma.cropCycle.findFirst({
        where: { plotId: input.plotId, cropId: crop.id },
        orderBy: { createdAt: 'desc' },
        include: { crop: true },
      })
    : await prisma.cropCycle.findFirst({
        where: { plotId: input.plotId, status: { notIn: ['completed', 'failed', 'abandoned'] } },
        include: { crop: true },
      })
  const sold = crop ?? cycle?.crop ?? null
  if (!sold) throw new Error('Pick what you sold.')
  const gross = input.quantity * input.unitPrice
  const extra = input.notes?.trim()
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
      notes: extra ? `${sold.name} · ${extra}` : sold.name,
    },
  })
  revalidatePath('/app', 'layout')
})}

export async function assistantConfirmAction(farmId: string, raw: string) { return runAction(async () => {
  const { user } = await requireFarm(farmId, 'write')
  const text = raw.trim().slice(0, 500)
  if (!text) throw new Error('Type a farm record or question first.')
  const result = await confirmParsed(farmId, user.id, text)
  revalidatePath('/app', 'layout')
  return result
})}

export async function setFarmLocationAction(input: {
  farmId: string
  lat: number
  lng: number
  label?: string
  ring: LatLng[]
}) { return runAction(async () => {
  const { farm } = await requireFarm(input.farmId, 'write')
  if (input.ring.length < 3) throw new Error('A farm boundary needs at least 3 corners.')
  const plots = await prisma.plot.findMany({
    where: { farmId: farm.id },
    select: { name: true, geoJson: true },
  })
  const outside = plots.filter((plot) => !ringInsideFarm(parseRingJson(plot.geoJson), input.ring))
  if (outside.length) {
    throw new Error(
      `The boundary must contain every saved plot. Outside: ${outside.map((plot) => plot.name).join(', ')}.`,
    )
  }
  const place = await reversePlace(input.lat, input.lng)
  const fromLabel = input.label?.split(',').map((p) => p.trim()).filter(Boolean)[0]
  const labelVillage = fromLabel && !isPoiName(fromLabel) ? fromLabel : undefined
  await prisma.farm.update({
    where: { id: farm.id },
    data: {
      lat: input.lat,
      lng: input.lng,
      geoJson: JSON.stringify(polygonFromRing(input.ring)),
      village: place?.village || labelVillage || (isPoiName(farm.village) ? null : farm.village),
      district: place?.district || farm.district,
      state: place?.state || farm.state,
    },
  })
  revalidatePath('/app', 'layout')
})}

export async function createFarmAction(input: {
  name: string
  village?: string
  season?: string
  startDate?: string
  endDate?: string
}) { return runAction(async () => {
  const user = await actor()
  if (!canWriteRole(user.role)) throw new Error('You can view this workspace but cannot add a farm.')
  const kind = weatherSeason(input.season)
  const fallback = seasonWindow(kind)
  const start = input.startDate ? parseDay(input.startDate) : fallback.start
  const end = input.endDate ? parseDay(input.endDate) : fallback.end
  if (end < start) throw new Error('End date must be on or after the start date.')
  const org = await prisma.organization.findUnique({ where: { id: user.organizationId } })
  if (!org) throw new Error('Your login is out of date. Sign out and sign in again.')
  const place = input.village?.trim() ? await searchPlace(input.village.trim()) : null
  const farm = await prisma.farm.create({
    data: {
      organizationId: user.organizationId,
      name: input.name,
      village: place?.village || input.village,
      district: place?.district,
      state: place?.state,
      lat: place?.lat,
      lng: place?.lng,
      season: kind,
      startDate: start,
      endDate: end,
      year: start.getFullYear(),
    },
  })
  await prisma.farmMember.create({
    data: { farmId: farm.id, userId: user.id, role: user.role },
  })
  await selectFarmAction(farm.id)
  revalidatePath('/app', 'layout')
  return farm.id
})}

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name needs at least 2 letters.'),
  email: z.string().trim().toLowerCase().email('That email does not look right.'),
})

export async function updateProfileAction(input: { name: string; email: string }) { return runAction(async () => {
  const me = await requireSession()
  const parsed = profileSchema.parse(input)
  const taken = await prisma.user.findFirst({
    where: { email: parsed.email, id: { not: me.id } },
    select: { id: true },
  })
  if (taken) throw new Error('Another account already uses that email.')
  await prisma.user.update({
    where: { id: me.id },
    data: { name: parsed.name, email: parsed.email },
  })
  revalidatePath('/app', 'layout')
})}

export async function changePasswordAction(input: {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}) { return runAction(async () => {
  const me = await requireSession()
  assertPasswordStrength(input.newPassword)
  if (input.newPassword !== input.confirmPassword) throw new Error('The two new passwords do not match.')
  const user = await prisma.user.findUnique({
    where: { id: me.id },
    select: { passwordHash: true, authEpoch: true },
  })
  if (!user) throw new Error('Your login is out of date. Sign out and sign in again.')
  const ok = await bcrypt.compare(input.currentPassword, user.passwordHash)
  if (!ok) throw new Error('Current password is wrong.')
  if (await bcrypt.compare(input.newPassword, user.passwordHash)) {
    throw new Error('New password must be different from the current one.')
  }
  await prisma.user.update({
    where: { id: me.id },
    data: {
      passwordHash: await bcrypt.hash(input.newPassword, 12),
      authEpoch: user.authEpoch + 1,
    },
  })
})}

export async function updateFarmNameAction(input: { farmId: string; name: string }) { return runAction(async () => {
  const name = input.name.trim()
  if (!name) throw new Error('Farm name is required.')
  await requireFarm(input.farmId, 'write')
  await prisma.farm.update({ where: { id: input.farmId }, data: { name } })
  revalidatePath('/app', 'layout')
})}

export async function updateFarmSeasonAction(input: {
  farmId: string
  season: string
  startDate: string
  endDate: string
}) { return runAction(async () => {
  await requireFarm(input.farmId, 'write')
  const kind = weatherSeason(input.season)
  const start = parseDay(input.startDate)
  const end = parseDay(input.endDate)
  if (end < start) throw new Error('End date must be on or after the start date.')
  await prisma.farm.update({
    where: { id: input.farmId },
    data: {
      season: kind,
      startDate: start,
      endDate: end,
      year: start.getFullYear(),
    },
  })
  revalidatePath('/app', 'layout')
})}

export async function updatePlotAction(input: {
  farmId: string
  plotId: string
  name: string
  code: string
  acres: number
  status: string
}) { return runAction(async () => {
  await requirePlot(input.farmId, input.plotId, 'write')
  const taken = await prisma.plot.findFirst({
    where: { farmId: input.farmId, code: input.code, id: { not: input.plotId } },
  })
  if (taken) throw new Error(`Plot code ${input.code} is already used by ${taken.name}.`)
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
})}

export async function createSimplePlotAction(_input: {
  farmId: string
  name: string
  code: string
  acres: number
}) { return runAction(async () => {
  throw new Error('Draw the plot boundary on this farm’s map. A plot belongs to one farm only.')
})}
