import { prisma } from '@/lib/prisma'
import { weatherPoint } from '@/lib/geo'
import { isoDay } from '@/lib/farm-season'
import { fetchOpenMeteoForecast, type WeatherForecast } from '@/lib/services/weather'
import { buildWeatherAdvisory, type FarmWeatherInput, type WeatherAdvisory } from '@/lib/services/weather-advisory'

const ACTIVE = { notIn: ['completed', 'failed', 'abandoned'] }

function dayOrEmpty(d: Date | null | undefined) {
  return d ? isoDay(d) : ''
}

function inferGrowthStage(planting: Date | null, transplant: Date | null, harvest: Date | null) {
  const start = transplant ?? planting
  if (!start) return { stage: '', source: 'missing' as const }
  const days = Math.floor((Date.now() - start.getTime()) / 86400000)
  if (harvest) {
    const toH = Math.round((harvest.getTime() - Date.now()) / 86400000)
    if (toH <= 14 && toH >= -7) return { stage: 'approaching harvest', source: 'inferred' as const }
  }
  if (days < 0) return { stage: 'not yet planted', source: 'inferred' as const }
  if (days <= 20) return { stage: 'establishment', source: 'inferred' as const }
  if (days <= 50) return { stage: 'vegetative', source: 'inferred' as const }
  if (days <= 80) return { stage: 'reproductive', source: 'inferred' as const }
  return { stage: 'mid to late season', source: 'inferred' as const }
}

function mostCommon(values: (string | null | undefined)[]) {
  const counts = new Map<string, number>()
  for (const v of values) {
    const t = v?.trim()
    if (!t) continue
    counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  let best = ''
  let n = 0
  for (const [k, c] of counts) {
    if (c > n) {
      best = k
      n = c
    }
  }
  return best
}

export type WeatherPageData = {
  point: { lat: number; lng: number; source: string } | null
  forecast: WeatherForecast | null
  advisory: WeatherAdvisory
  input: FarmWeatherInput
}

export async function loadWeatherAdvisory(farmId: string): Promise<WeatherPageData> {
  const farm = await prisma.farm.findUniqueOrThrow({ where: { id: farmId } })
  const plots = await prisma.plot.findMany({ where: { farmId }, orderBy: { code: 'asc' } })
  const cycles = await prisma.cropCycle.findMany({
    where: { plot: { farmId }, status: ACTIVE },
    include: { crop: true, variety: true, plot: true },
  })

  const dominant = [...cycles].sort((a, b) => b.plot.acres - a.plot.acres)[0] ?? null
  const cycleIds = cycles.map((c) => c.id)
  const plotIds = plots.map((p) => p.id)

  const [irrigations, fertilizers, protection, activities, pests, diseases] = await Promise.all([
    plotIds.length
      ? prisma.irrigationRecord.findMany({ where: { plotId: { in: plotIds } }, orderBy: { date: 'desc' }, take: 1 })
      : [],
    cycleIds.length
      ? prisma.fertilizerApplication.findMany({ where: { cropCycleId: { in: cycleIds } }, orderBy: { date: 'desc' }, take: 1 })
      : [],
    cycleIds.length
      ? prisma.cropProtectionApplication.findMany({ where: { cropCycleId: { in: cycleIds } }, orderBy: { date: 'desc' }, take: 5 })
      : [],
    prisma.activity.findMany({ where: { farmId }, orderBy: { date: 'desc' }, take: 1 }),
    plotIds.length
      ? prisma.pestObservation.findMany({
          where: { plotId: { in: plotIds }, date: { gte: new Date(Date.now() - 21 * 86400000) } },
          orderBy: { date: 'desc' },
          take: 3,
        })
      : [],
    plotIds.length
      ? prisma.diseaseObservation.findMany({
          where: { plotId: { in: plotIds }, date: { gte: new Date(Date.now() - 21 * 86400000) } },
          orderBy: { date: 'desc' },
          take: 3,
        })
      : [],
  ])

  const lastProtect = protection[0]
  const sprayLike = protection.filter((p) => !/fung/i.test(`${p.product} ${p.target ?? ''}`))[0]
  const fungLike = protection.filter((p) => /fung/i.test(`${p.product} ${p.target ?? ''}`))[0]
  const growth = inferGrowthStage(
    dominant?.plantingDate ?? dominant?.startDate ?? null,
    dominant?.transplantingDate ?? null,
    dominant?.expectedHarvest ?? null,
  )

  const point = weatherPoint(farm, plots)
  let forecast: WeatherForecast | null = null
  let forecast_error = ''
  if (!point) {
    forecast_error = 'No farm boundary or map pin is stored, so weather was not requested.'
  } else {
    try {
      forecast = await fetchOpenMeteoForecast(point.lat, point.lng, 7)
      forecast.location.source = point.source
    } catch (err) {
      forecast_error = err instanceof Error ? err.message : 'Weather request failed.'
    }
  }

  const lastActivity = activities[0]
  const input: FarmWeatherInput = {
    farm_id: farm.id,
    farm_name: farm.name,
    farm_location: [farm.village, farm.district, farm.state].filter(Boolean).join(', '),
    district: farm.district ?? '',
    state: farm.state ?? '',
    latitude: point?.lat ?? farm.lat ?? null,
    longitude: point?.lng ?? farm.lng ?? null,
    coordinate_source: point?.source ?? null,
    farm_area: plots.reduce((s, p) => s + p.acres, 0) || null,
    soil_type: mostCommon(plots.map((p) => p.soilType)),
    irrigation_method: dominant?.irrigationMethod || mostCommon(plots.map((p) => p.irrigation)),
    irrigation_status: irrigations[0] ? `Last irrigation ${isoDay(irrigations[0].date)}` : '',
    crop_name: dominant?.crop.name ?? '',
    crop_variety: dominant?.variety?.name ?? '',
    sowing_date: dayOrEmpty(dominant?.plantingDate ?? dominant?.startDate),
    transplanting_date: dayOrEmpty(dominant?.transplantingDate),
    growth_stage: growth.stage,
    growth_stage_source: growth.source,
    expected_harvest_date: dayOrEmpty(dominant?.expectedHarvest),
    crop_area: dominant?.plot.acres ?? null,
    last_irrigation_date: dayOrEmpty(irrigations[0]?.date),
    last_fertilizer_date: dayOrEmpty(fertilizers[0]?.date),
    last_pesticide_date: dayOrEmpty(sprayLike?.date ?? lastProtect?.date),
    last_fungicide_date: dayOrEmpty(fungLike?.date),
    recent_field_activity: lastActivity ? `${isoDay(lastActivity.date)} · ${lastActivity.type}` : '',
    pest_records: pests.map((p) => `${p.pest} (${p.severity})`).join(', '),
    disease_records: diseases.map((d) => `${d.disease} (${d.severity})`).join(', '),
    farmer_language: 'English',
    forecast,
    forecast_error,
  }

  return {
    point,
    forecast,
    advisory: buildWeatherAdvisory(input),
    input,
  }
}
