import { prisma } from '@/lib/prisma'

export type RecordActivityInput = {
  farmId: string
  plotId: string
  cropCycleId?: string | null
  type: string
  date: Date
  description?: string
  notes?: string
  userId?: string
  labourWorkers?: number
  labourHours?: number
  labourRate?: number
  machineCost?: number
  inputName?: string
  inputQty?: number
  inputUnit?: string
  inputCost?: number
  expenseCategory?: string
}

export async function recordActivity(input: RecordActivityInput) {
  const labourCost =
    input.labourWorkers && input.labourRate
      ? input.labourWorkers * input.labourRate * (input.labourHours ? input.labourHours / 8 : 1)
      : 0
  const machineCost = input.machineCost ?? 0
  const inputCost = input.inputCost ?? 0
  const totalCost = labourCost + machineCost + inputCost

  return prisma.$transaction(async (tx) => {
    const plot = await tx.plot.findUnique({ where: { id: input.plotId } })
    if (!plot || plot.farmId !== input.farmId) {
      throw new Error('Plot does not belong to this farm.')
    }

    let cropCycleId = input.cropCycleId ?? null
    if (!cropCycleId) {
      const current = await tx.cropCycle.findFirst({
        where: {
          plotId: input.plotId,
          status: { notIn: ['completed', 'failed', 'abandoned'] },
        },
        orderBy: { year: 'desc' },
      })
      cropCycleId = current?.id ?? null
    }

    const activity = await tx.activity.create({
      data: {
        farmId: input.farmId,
        plotId: input.plotId,
        cropCycleId,
        type: input.type,
        date: input.date,
        description: input.description,
        notes: input.notes,
        labourCost,
        machineCost,
        inputCost,
        totalCost,
        createdById: input.userId,
      },
    })

    if (labourCost > 0) {
      await tx.expense.create({
        data: {
          farmId: input.farmId,
          plotId: input.plotId,
          cropCycleId,
          activityId: activity.id,
          category: 'labour',
          date: input.date,
          amount: labourCost,
          createdById: input.userId,
        },
      })
      await tx.labourRecord.create({
        data: {
          plotId: input.plotId,
          cropCycleId,
          activityId: activity.id,
          date: input.date,
          workers: input.labourWorkers ?? 0,
          hours: input.labourHours,
          cost: labourCost,
        },
      })
    }

    if (machineCost > 0) {
      await tx.expense.create({
        data: {
          farmId: input.farmId,
          plotId: input.plotId,
          cropCycleId,
          activityId: activity.id,
          category: 'machinery',
          date: input.date,
          amount: machineCost,
          createdById: input.userId,
        },
      })
    }

    if (inputCost > 0) {
      await tx.expense.create({
        data: {
          farmId: input.farmId,
          plotId: input.plotId,
          cropCycleId,
          activityId: activity.id,
          category: input.expenseCategory ?? 'other',
          date: input.date,
          quantity: input.inputQty,
          unit: input.inputUnit,
          amount: inputCost,
          createdById: input.userId,
        },
      })
    }

    if (input.inputName && input.inputQty && input.inputQty > 0) {
      const item = await tx.inventoryItem.findFirst({
        where: {
          farmId: input.farmId,
          name: { equals: input.inputName },
        },
      })
      if (item) {
        const remaining = item.qtyOnHand - input.inputQty
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { qtyOnHand: remaining },
        })
        await tx.inventoryTransaction.create({
          data: {
            itemId: item.id,
            activityId: activity.id,
            type: 'use',
            qty: input.inputQty,
            previousQty: item.qtyOnHand,
            remainingQty: remaining,
            reason: input.type,
            createdById: input.userId,
          },
        })
      }
    }

    if (input.expenseCategory === 'fertilizer' && cropCycleId && input.inputName && input.inputQty) {
      const item = await tx.inventoryItem.findFirst({
        where: { farmId: input.farmId, name: { equals: input.inputName } },
      })
      await tx.fertilizerApplication.create({
        data: {
          cropCycleId,
          activityId: activity.id,
          product: input.inputName,
          quantity: input.inputQty,
          unit: input.inputUnit ?? 'kg',
          date: input.date,
          nKg: item?.nPct != null ? (item.nPct / 100) * input.inputQty : null,
          pKg: item?.pPct != null ? (item.pPct / 100) * input.inputQty : null,
          kKg: item?.kPct != null ? (item.kPct / 100) * input.inputQty : null,
        },
      })
    }

    await tx.auditLog.create({
      data: {
        userId: input.userId,
        action: 'create',
        entity: 'Activity',
        entityId: activity.id,
        next: JSON.stringify({ type: input.type, totalCost, plotId: input.plotId }),
      },
    })

    return activity
  })
}

export async function recordExpense(input: {
  farmId: string
  plotId?: string | null
  cropCycleId?: string | null
  category: string
  date: Date
  amount: number
  quantity?: number
  unit?: string
  unitPrice?: number
  notes?: string
  userId?: string
}) {
  return prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        farmId: input.farmId,
        plotId: input.plotId,
        cropCycleId: input.cropCycleId,
        category: input.category,
        date: input.date,
        amount: input.amount,
        quantity: input.quantity,
        unit: input.unit,
        unitPrice: input.unitPrice,
        notes: input.notes,
        createdById: input.userId,
      },
    })
    await tx.auditLog.create({
      data: {
        userId: input.userId,
        action: 'create',
        entity: 'Expense',
        entityId: expense.id,
        next: JSON.stringify({ amount: input.amount, category: input.category }),
      },
    })
    return expense
  })
}

export async function voidExpense(id: string, userId: string, reason: string) {
  const existing = await prisma.expense.findUnique({ where: { id } })
  if (!existing) throw new Error('Expense not found.')
  if (existing.voided) throw new Error('Expense is already voided.')
  return prisma.$transaction(async (tx) => {
    const updated = await tx.expense.update({
      where: { id },
      data: { voided: true },
    })
    await tx.auditLog.create({
      data: {
        userId,
        action: 'void',
        entity: 'Expense',
        entityId: id,
        previous: JSON.stringify({ amount: existing.amount }),
        reason,
      },
    })
    return updated
  })
}
