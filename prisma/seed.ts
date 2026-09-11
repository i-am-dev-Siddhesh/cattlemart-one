import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { polygonFromRing } from '../lib/geo'

const prisma = new PrismaClient()

function square(lat: number, lng: number, d = 0.0022) {
  return polygonFromRing([
    { lat, lng },
    { lat, lng: lng + d },
    { lat: lat + d * 0.8, lng: lng + d },
    { lat: lat + d * 0.8, lng },
  ])
}

async function main() {
  await prisma.auditLog.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.document.deleteMany()
  await prisma.task.deleteMany()
  await prisma.sale.deleteMany()
  await prisma.harvestBatch.deleteMany()
  await prisma.harvest.deleteMany()
  await prisma.equipmentMaintenance.deleteMany()
  await prisma.equipmentUsage.deleteMany()
  await prisma.equipment.deleteMany()
  await prisma.labourRecord.deleteMany()
  await prisma.worker.deleteMany()
  await prisma.soilTest.deleteMany()
  await prisma.diseaseObservation.deleteMany()
  await prisma.pestObservation.deleteMany()
  await prisma.cropObservation.deleteMany()
  await prisma.irrigationRecord.deleteMany()
  await prisma.cropProtectionApplication.deleteMany()
  await prisma.fertilizerApplication.deleteMany()
  await prisma.inventoryTransaction.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.inventoryItem.deleteMany()
  await prisma.buyer.deleteMany()
  await prisma.vendor.deleteMany()
  await prisma.cropCycle.deleteMany()
  await prisma.cropVariety.deleteMany()
  await prisma.crop.deleteMany()
  await prisma.plot.deleteMany()
  await prisma.farmMember.deleteMany()
  await prisma.farm.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()

  const org = await prisma.organization.create({
    data: { name: 'Green Valley Farms', demo: true },
  })
  const passwordHash = await bcrypt.hash('farmos-demo', 10)
  const user = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'ramesh@greenvalley.farm',
      name: 'Ramesh Patil',
      passwordHash,
      role: 'owner',
    },
  })

  const farm = await prisma.farm.create({
    data: {
      organizationId: org.id,
      name: 'Green Valley Farm',
      village: 'Niphad',
      district: 'Nashik',
      state: 'Maharashtra',
      lat: 20.083,
      lng: 74.11,
      geoJson: JSON.stringify(
        polygonFromRing([
          { lat: 20.0794, lng: 74.1064 },
          { lat: 20.0794, lng: 74.1146 },
          { lat: 20.0868, lng: 74.1146 },
          { lat: 20.0868, lng: 74.1064 },
        ]),
      ),
      season: 'Kharif 2026',
      year: 2026,
      notes: 'DEMO DATA — not a live farm ledger.',
    },
  })
  await prisma.farmMember.create({
    data: { farmId: farm.id, userId: user.id, role: 'owner' },
  })

  const rice = await prisma.crop.create({ data: { farmId: farm.id, name: 'Rice', localName: 'भात', scientificName: 'Oryza sativa' } })
  const tomato = await prisma.crop.create({ data: { farmId: farm.id, name: 'Tomato', localName: 'टमाटर', scientificName: 'Solanum lycopersicum' } })
  const groundnut = await prisma.crop.create({ data: { farmId: farm.id, name: 'Groundnut', localName: 'शेंगदाणा', scientificName: 'Arachis hypogaea' } })
  const banana = await prisma.crop.create({ data: { farmId: farm.id, name: 'Banana', localName: 'केळी', scientificName: 'Musa' } })

  const tomatoVar = await prisma.cropVariety.create({
    data: { cropId: tomato.id, name: 'Abhinav', hybrid: true },
  })

  const plots = await Promise.all([
    prisma.plot.create({
      data: {
        farmId: farm.id,
        code: '01',
        name: 'Plot 01',
        acres: 3.2,
        status: 'growing',
        irrigation: 'Canal + pump',
        soilType: 'Black cotton',
        geoJson: JSON.stringify(square(20.081, 74.108)),
      },
    }),
    prisma.plot.create({
      data: {
        farmId: farm.id,
        code: '02',
        name: 'Plot 02',
        acres: 2.4,
        status: 'attention',
        irrigation: 'Drip',
        soilType: 'Red loam',
        geoJson: JSON.stringify(square(20.081, 74.111)),
      },
    }),
    prisma.plot.create({
      data: {
        farmId: farm.id,
        code: '03',
        name: 'Plot 03',
        acres: 2.8,
        status: 'harvesting',
        irrigation: 'Drip',
        soilType: 'Sandy loam',
        geoJson: JSON.stringify(square(20.0838, 74.108)),
      },
    }),
    prisma.plot.create({
      data: {
        farmId: farm.id,
        code: '04',
        name: 'Plot 04',
        acres: 1.6,
        status: 'healthy',
        irrigation: 'Basin',
        soilType: 'Alluvial',
        geoJson: JSON.stringify(square(20.0838, 74.111)),
      },
    }),
  ])
  const [p1, p2, p3, p4] = plots

  const c1 = await prisma.cropCycle.create({
    data: {
      plotId: p1.id,
      cropId: rice.id,
      season: 'Jun–Oct 2026',
      year: 2026,
      status: 'growing',
      startDate: new Date('2026-06-18'),
      endDate: new Date('2026-10-20'),
      plantingDate: new Date('2026-06-18'),
      expectedHarvest: new Date('2026-10-20'),
      irrigationMethod: 'Flood',
    },
  })
  await prisma.cropCycle.create({
    data: {
      plotId: p1.id,
      cropId: rice.id,
      season: 'Jun–Oct 2025',
      year: 2025,
      status: 'completed',
      startDate: new Date('2025-06-12'),
      endDate: new Date('2025-10-15'),
      plantingDate: new Date('2025-06-12'),
      actualHarvest: new Date('2025-10-15'),
    },
  })

  const c2prev = await prisma.cropCycle.create({
    data: {
      plotId: p2.id,
      cropId: groundnut.id,
      season: 'Jun–Oct 2025',
      year: 2025,
      status: 'completed',
      startDate: new Date('2025-06-20'),
      endDate: new Date('2025-10-02'),
      plantingDate: new Date('2025-06-20'),
      actualHarvest: new Date('2025-10-02'),
    },
  })
  const c2 = await prisma.cropCycle.create({
    data: {
      plotId: p2.id,
      cropId: tomato.id,
      varietyId: tomatoVar.id,
      season: 'Jul–Sep 2026',
      year: 2026,
      status: 'fruiting',
      startDate: new Date('2026-07-20'),
      endDate: new Date('2026-09-18'),
      seedSource: 'Mahyco dealer',
      seedSupplier: 'Niphad Agro',
      seedLot: 'ABH-26-04',
      plantingDate: new Date('2026-07-20'),
      transplantingDate: new Date('2026-07-20'),
      expectedHarvest: new Date('2026-09-18'),
      plantingMethod: 'Transplant',
      irrigationMethod: 'Drip',
    },
  })

  const c3 = await prisma.cropCycle.create({
    data: {
      plotId: p3.id,
      cropId: groundnut.id,
      season: 'Jun–Sep 2026',
      year: 2026,
      status: 'harvesting',
      startDate: new Date('2026-06-08'),
      endDate: new Date('2026-09-10'),
      plantingDate: new Date('2026-06-08'),
      expectedHarvest: new Date('2026-09-10'),
    },
  })
  const c4 = await prisma.cropCycle.create({
    data: {
      plotId: p4.id,
      cropId: banana.id,
      season: 'Nov 2025–Nov 2026',
      year: 2025,
      status: 'growing',
      startDate: new Date('2025-11-02'),
      endDate: new Date('2026-11-02'),
      plantingDate: new Date('2025-11-02'),
    },
  })

  const vendor = await prisma.vendor.create({ data: { farmId: farm.id, name: 'Niphad Agro Inputs' } })
  const buyer = await prisma.buyer.create({ data: { farmId: farm.id, name: 'Nashik Mandi trader' } })

  const npk = await prisma.inventoryItem.create({
    data: {
      farmId: farm.id,
      name: 'NPK 20-20-20',
      kind: 'fertilizer',
      unit: 'kg',
      brand: 'Generic',
      nPct: 20,
      pPct: 20,
      kPct: 20,
      qtyOnHand: 200,
      unitCost: 90,
    },
  })
  await prisma.inventoryItem.create({
    data: {
      farmId: farm.id,
      name: 'Urea',
      kind: 'fertilizer',
      unit: 'kg',
      nPct: 46,
      qtyOnHand: 80,
      unitCost: 28,
    },
  })

  const act = await prisma.activity.create({
    data: {
      farmId: farm.id,
      plotId: p2.id,
      cropCycleId: c2.id,
      type: 'Fertilizing',
      date: new Date('2026-08-25'),
      description: 'NPK fertigation',
      inputCost: 4500,
      totalCost: 4500,
      createdById: user.id,
    },
  })
  await prisma.expense.create({
    data: {
      farmId: farm.id,
      plotId: p2.id,
      cropCycleId: c2.id,
      activityId: act.id,
      vendorId: vendor.id,
      category: 'fertilizer',
      date: new Date('2026-08-25'),
      quantity: 50,
      unit: 'kg',
      unitPrice: 90,
      amount: 4500,
      createdById: user.id,
    },
  })
  await prisma.inventoryTransaction.create({
    data: {
      itemId: npk.id,
      activityId: act.id,
      type: 'use',
      qty: 50,
      previousQty: 250,
      remainingQty: 200,
      reason: 'Fertilizing',
      createdById: user.id,
    },
  })
  await prisma.fertilizerApplication.create({
    data: {
      cropCycleId: c2.id,
      activityId: act.id,
      product: 'NPK 20-20-20',
      quantity: 50,
      unit: 'kg',
      method: 'Fertigation',
      nKg: 10,
      pKg: 10,
      kKg: 10,
      date: new Date('2026-08-25'),
    },
  })

  await prisma.activity.create({
    data: {
      farmId: farm.id,
      plotId: p2.id,
      cropCycleId: c2.id,
      type: 'Weeding',
      date: new Date('2026-08-10'),
      labourCost: 1800,
      totalCost: 1800,
      createdById: user.id,
    },
  })
  await prisma.expense.create({
    data: {
      farmId: farm.id,
      plotId: p2.id,
      cropCycleId: c2.id,
      category: 'labour',
      date: new Date('2026-08-10'),
      amount: 1800,
    },
  })
  await prisma.labourRecord.create({
    data: {
      plotId: p2.id,
      cropCycleId: c2.id,
      date: new Date('2026-08-10'),
      workers: 4,
      hours: 8,
      cost: 1800,
    },
  })

  await prisma.irrigationRecord.create({
    data: {
      plotId: p2.id,
      cropCycleId: c2.id,
      date: new Date('2026-08-28'),
      method: 'Drip',
      quantityL: 3200,
      source: 'Well',
    },
  })
  await prisma.activity.create({
    data: {
      farmId: farm.id,
      plotId: p2.id,
      cropCycleId: c2.id,
      type: 'Irrigation',
      date: new Date('2026-08-28'),
      description: '3200 L drip',
    },
  })

  await prisma.diseaseObservation.create({
    data: {
      plotId: p2.id,
      cropCycleId: c2.id,
      date: new Date('2026-08-21'),
      disease: 'Early blight (suspected)',
      severity: 'moderate',
      symptoms: 'Lower leaf spots after rain. Photo ID is not certain.',
      notes: 'Needs agronomist confirmation.',
    },
  })
  await prisma.pestObservation.create({
    data: {
      plotId: p2.id,
      cropCycleId: c2.id,
      date: new Date('2026-08-18'),
      pest: 'Whitefly',
      severity: 'low',
      affectedPct: 8,
    },
  })
  await prisma.cropObservation.create({
    data: {
      plotId: p2.id,
      cropCycleId: c2.id,
      date: new Date('2026-08-22'),
      severity: 'moderate',
      note: 'Plants look stressed after heavy rain. Waterlogging near western boundary.',
    },
  })

  await prisma.soilTest.create({
    data: {
      plotId: p2.id,
      date: new Date('2026-05-14'),
      lab: 'District soil lab (demo)',
      ph: 7.1,
      oc: 0.62,
      n: 248,
      p: 18,
      k: 210,
      notes: 'Values from demo seed, labelled as demo.',
    },
  })

  for (const [plot, cycle, amount] of [
    [p1, c1, 18600],
    [p3, c3, 22400],
    [p4, c4, 31200],
  ] as const) {
    await prisma.expense.create({
      data: {
        farmId: farm.id,
        plotId: plot.id,
        cropCycleId: cycle.id,
        category: 'other',
        date: new Date('2026-07-01'),
        amount,
        notes: 'Season-to-date recorded costs (demo)',
      },
    })
  }

  await prisma.expense.create({
    data: {
      farmId: farm.id,
      plotId: p2.id,
      cropCycleId: c2prev.id,
      category: 'other',
      date: new Date('2025-09-01'),
      amount: 52400,
      notes: '2025 groundnut cycle total (demo)',
    },
  })
  const hPrev = await prisma.harvest.create({
    data: {
      plotId: p2.id,
      cropCycleId: c2prev.id,
      date: new Date('2025-10-02'),
      quantity: 1.8,
      unit: 't',
      marketableQty: 1.7,
    },
  })
  await prisma.sale.create({
    data: {
      farmId: farm.id,
      plotId: p2.id,
      cropCycleId: c2prev.id,
      harvestId: hPrev.id,
      buyerId: buyer.id,
      date: new Date('2025-10-08'),
      quantity: 1.7,
      unit: 't',
      unitPrice: 57000,
      gross: 96900,
      deductions: 0,
      net: 96900,
      paymentStatus: 'paid',
    },
  })

  const h3 = await prisma.harvest.create({
    data: {
      plotId: p3.id,
      cropCycleId: c3.id,
      date: new Date('2026-09-08'),
      quantity: 1.1,
      unit: 't',
      grade: 'FAQ',
      marketableQty: 1.05,
    },
  })
  await prisma.harvestBatch.create({
    data: { harvestId: h3.id, code: 'GN-26-01', quantity: 1.05, unit: 't', storage: 'Farm godown' },
  })
  await prisma.sale.create({
    data: {
      farmId: farm.id,
      plotId: p3.id,
      cropCycleId: c3.id,
      harvestId: h3.id,
      buyerId: buyer.id,
      date: new Date('2026-09-09'),
      quantity: 1.05,
      unit: 't',
      unitPrice: 62000,
      gross: 65100,
      net: 65100,
      paymentStatus: 'pending',
    },
  })

  await prisma.worker.create({ data: { farmId: farm.id, name: 'Suresh', wage: 450, wageUnit: 'day' } })
  await prisma.equipment.create({ data: { farmId: farm.id, name: 'Mahindra 575', kind: 'tractor' } })
  await prisma.task.create({
    data: {
      farmId: farm.id,
      plotId: p2.id,
      title: 'Follow-up blight check',
      dueDate: new Date('2026-09-14'),
      priority: 'high',
      status: 'planned',
    },
  })
  await prisma.notification.createMany({
    data: [
      { farmId: farm.id, title: 'Disease watch', body: 'Plot 02 has a suspected early blight observation.', kind: 'health' },
      { farmId: farm.id, title: 'Inventory', body: 'NPK 20-20-20 is at 200 kg after the last activity.', kind: 'inventory' },
      { farmId: farm.id, title: 'Harvest window', body: 'Plot 02 tomato expected harvest around 18 Sep 2026.', kind: 'harvest' },
    ],
  })
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'seed',
      entity: 'Organization',
      entityId: org.id,
      next: JSON.stringify({ demo: true }),
      reason: 'Demo dataset',
    },
  })

  console.log('Seeded Green Valley Farm (demo)')
  console.log('Login: ramesh@greenvalley.farm / farmos-demo')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
