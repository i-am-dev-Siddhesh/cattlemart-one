import type { WeatherDay, WeatherForecast } from '@/lib/services/weather'

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
export type Urgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type FarmWeatherInput = {
  farm_id: string
  farm_name: string
  farm_location: string
  district: string
  state: string
  latitude: number | null
  longitude: number | null
  coordinate_source: string | null
  farm_area: number | null
  soil_type: string
  irrigation_method: string
  irrigation_status: string
  crop_name: string
  crop_variety: string
  sowing_date: string
  transplanting_date: string
  growth_stage: string
  growth_stage_source: 'inferred' | 'missing'
  expected_harvest_date: string
  crop_area: number | null
  last_irrigation_date: string
  last_fertilizer_date: string
  last_pesticide_date: string
  last_fungicide_date: string
  recent_field_activity: string
  pest_records: string
  disease_records: string
  farmer_language: 'English'
  forecast: WeatherForecast | null
  forecast_error: string
}

export type WeatherAdvisory = {
  overall_risk: RiskLevel
  summary: string
  priority_actions: {
    priority: number
    action: string
    reason: string
    recommended_date: string
    urgency: Urgency
  }[]
  daily_advisory: {
    date: string
    weather_summary: string
    crop_impact: string
    irrigation: { recommendation: string; reason: string }
    fertilizer: { recommendation: string; reason: string }
    spraying: { recommendation: string; reason: string }
    disease_risk: { level: 'LOW' | 'MODERATE' | 'HIGH'; reason: string }
    pest_risk: { level: 'LOW' | 'MODERATE' | 'HIGH'; reason: string }
    farm_operations: { operation: string; recommendation: string; reason: string }[]
  }[]
  weather_risks: {
    risk: string
    severity: RiskLevel
    expected_date: string
    crop_impact: string
    recommended_action: string
  }[]
  best_operation_windows: {
    operation: string
    recommended_date: string
    preferred_time: string
    reason: string
  }[]
  farmer_message: string
  confidence: 'LOW' | 'MEDIUM' | 'HIGH'
  missing_information: string[]
}

const WET_MM = 2.5
const USEFUL_RAIN_MM = 8
const HEAVY_MM = 25
const VERY_HEAVY_MM = 50
const LIKELY_RAIN = 60
const WIND_AVOID = 20
const WIND_CAUTION = 15
const HOT = 35
const VERY_HOT = 38
const EXTREME_HOT = 42
const COOL = 10
const FROST = 2
const HUMID = 80

function todayIso() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function n(v: number | null | undefined) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function rainMm(d: WeatherDay) {
  return n(d.rainfall) ?? n(d.precipitation)
}

function wet(d: WeatherDay) {
  const mm = rainMm(d)
  const p = n(d.precipitation_probability)
  return (mm != null && mm >= WET_MM) || (p != null && p >= LIKELY_RAIN && (mm == null || mm >= 1))
}

function fmt(v: number | null, unit: string) {
  if (v == null) return null
  return `${v % 1 === 0 ? v : v.toFixed(1)}${unit}`
}

function cropLabel(input: FarmWeatherInput) {
  return input.crop_name || 'your crop'
}

function harvestSoon(input: FarmWeatherInput) {
  if (!input.expected_harvest_date) return false
  const h = new Date(`${input.expected_harvest_date}T00:00:00`)
  if (Number.isNaN(h.getTime())) return false
  const days = Math.round((h.getTime() - Date.now()) / 86400000)
  return days <= 21 && days >= -3
}

function lateSeason(input: FarmWeatherInput) {
  const stage = input.growth_stage.toLowerCase()
  return (
    harvestSoon(input) ||
    stage.includes('harvest') ||
    stage.includes('maturity') ||
    stage.includes('late')
  )
}

function establishment(input: FarmWeatherInput) {
  const stage = input.growth_stage.toLowerCase()
  return stage.includes('establish') || stage.includes('seedling') || stage.includes('not yet')
}

function missingList(input: FarmWeatherInput): string[] {
  const missing: string[] = []
  if (!input.forecast) missing.push('Usable weather forecast')
  if (input.latitude == null || input.longitude == null) missing.push('Farm boundary or map pin so weather can be requested')
  if (!input.crop_name) missing.push('Active crop on the farm')
  if (!input.growth_stage) missing.push('Crop growth stage')
  else if (input.growth_stage_source === 'inferred') missing.push('Recorded growth stage (currently inferred from planting date)')
  if (!input.soil_type) missing.push('Soil type')
  if (!input.irrigation_method) missing.push('Irrigation method')
  if (!input.sowing_date && !input.transplanting_date) missing.push('Sowing or transplanting date')
  if (!input.expected_harvest_date) missing.push('Expected harvest date')
  if (!input.last_irrigation_date) missing.push('Last irrigation date')
  return missing
}

function confidence(input: FarmWeatherInput, days: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (!input.forecast || days === 0) return 'LOW'
  let score = 0
  if (days >= 5) score += 2
  else if (days >= 3) score += 1
  if (input.crop_name) score += 1
  if (input.growth_stage) score += 1
  if (input.soil_type) score += 1
  if (input.irrigation_method) score += 1
  if (input.latitude != null) score += 1
  if (score >= 7) return 'HIGH'
  if (score >= 4) return 'MEDIUM'
  return 'LOW'
}

function diseaseForDay(d: WeatherDay, wetStreak: number): { level: 'LOW' | 'MODERATE' | 'HIGH'; reason: string } {
  const hum = n(d.humidity)
  const mm = rainMm(d)
  const humid = hum != null && hum >= HUMID
  const rainy = mm != null && mm >= WET_MM
  if ((humid && rainy) || wetStreak >= 3) {
    return {
      level: 'HIGH',
      reason: 'Wet weather and high humidity can raise fungal disease risk. This is risk, not a confirmed disease. Inspect leaves and the lower canopy.',
    }
  }
  if (humid || rainy || wetStreak >= 2) {
    return {
      level: 'MODERATE',
      reason: 'Humidity or rain may increase disease risk. Watch for spots or wilting. Do not treat as a confirmed outbreak.',
    }
  }
  return { level: 'LOW', reason: 'Weather does not show a strong disease-risk pattern for this day.' }
}

function pestForDay(d: WeatherDay, input: FarmWeatherInput): { level: 'LOW' | 'MODERATE' | 'HIGH'; reason: string } {
  const tmax = n(d.temperature_max)
  const mm = rainMm(d) ?? 0
  const warmDry = tmax != null && tmax >= 32 && mm < 2
  if (warmDry && !establishment(input)) {
    return {
      level: 'MODERATE',
      reason: 'Warm and mostly dry weather may favour insect activity. Check the crop. This does not confirm pests are present.',
    }
  }
  if (input.pest_records) {
    return {
      level: 'MODERATE',
      reason: `A pest record already exists (${input.pest_records}). Weather does not confirm a new infestation. Keep monitoring.`,
    }
  }
  return { level: 'LOW', reason: 'Weather does not show a strong pest-pressure pattern for this day.' }
}

function irrigationForDay(d: WeatherDay, input: FarmWeatherInput, next: WeatherDay | undefined) {
  const mm = rainMm(d)
  const nextMm = next ? rainMm(next) : null
  const p = n(d.precipitation_probability)
  const tmax = n(d.temperature_max)
  const soil = n(d.soil_moisture)
  const et = n(d.evapotranspiration)
  const clay = /clay|black/i.test(input.soil_type)

  if ((mm != null && mm >= VERY_HEAVY_MM) || (mm != null && mm >= HEAVY_MM)) {
    return { recommendation: 'AVOID', reason: `${fmt(mm, ' mm')} rain is in the forecast. Do not irrigate.` }
  }
  if ((mm != null && mm >= USEFUL_RAIN_MM) || (p != null && p >= 70 && (mm == null || mm >= 2))) {
    return {
      recommendation: 'SKIP',
      reason: `Rain is likely${mm != null ? ` (${fmt(mm, ' mm')})` : p != null ? ` (${Math.round(p)}% chance)` : ''}. Skip irrigation.`,
    }
  }
  if (nextMm != null && nextMm >= USEFUL_RAIN_MM) {
    return { recommendation: 'DELAY', reason: `${fmt(nextMm, ' mm')} rain is forecast the next day. Delay irrigation.` }
  }
  if (soil != null && soil >= 0.35) {
    return { recommendation: 'REDUCE', reason: 'Soil moisture in the forecast is already high. Reduce or skip a turn.' }
  }
  if (mm != null && mm < 1 && tmax != null && tmax >= HOT && (et == null || et >= 4) && !lateSeason(input)) {
    const extra = clay ? ' Clay/black soil holds water longer, so check the field before adding a full turn.' : ''
    return {
      recommendation: 'INCREASE',
      reason: `A dry, hot day is forecast${fmt(tmax, '°C') ? ` (high ${fmt(tmax, '°C')})` : ''}.${extra}`,
    }
  }
  if (!input.irrigation_method && !input.last_irrigation_date) {
    return { recommendation: 'NO_CHANGE', reason: 'No irrigation method or last irrigation date is recorded. Keep the usual schedule unless rain arrives.' }
  }
  return { recommendation: 'CONTINUE', reason: 'No strong rain or heat signal for a change. Continue the usual irrigation if the soil is drying.' }
}

function fertilizerForDay(d: WeatherDay, next: WeatherDay | undefined) {
  const mm = rainMm(d)
  const nextMm = next ? rainMm(next) : null
  const p = n(d.precipitation_probability)
  if (mm != null && mm >= HEAVY_MM) {
    return { recommendation: 'AVOID', reason: 'Heavy rain can wash nutrients away. Do not apply fertilizer.' }
  }
  if ((mm != null && mm >= 8) || (nextMm != null && nextMm >= HEAVY_MM) || (p != null && p >= 70)) {
    return { recommendation: 'DELAY', reason: 'Rain is likely. Delay fertilizer so it is not washed off.' }
  }
  if ((mm == null || mm < 2) && (p == null || p < 40)) {
    return { recommendation: 'APPLY', reason: 'No heavy rain is shown for this day. Fertilizer can be applied if the crop needs it. No rate is suggested here.' }
  }
  return { recommendation: 'NO_CHANGE', reason: 'Weather is mixed. Apply only if already planned and rain is not starting soon.' }
}

function sprayingForDay(d: WeatherDay) {
  const mm = rainMm(d)
  const p = n(d.precipitation_probability)
  const wind = n(d.wind_speed)
  const tmax = n(d.temperature_max)
  if (wind != null && wind >= WIND_AVOID) {
    return { recommendation: 'AVOID', reason: `Wind up to ${fmt(wind, ' km/h')} is forecast. Spray can drift. Do not spray.` }
  }
  if ((mm != null && mm >= 2) || (p != null && p >= 50)) {
    return { recommendation: 'DELAY', reason: 'Rain may wash spray off. Wait for a drier window. No chemical dose is given here.' }
  }
  if (tmax != null && tmax >= VERY_HOT) {
    return { recommendation: 'DELAY', reason: 'Very hot hours can stress the crop if sprayed. Wait for a cooler, still period.' }
  }
  if (wind != null && wind >= WIND_CAUTION) {
    return { recommendation: 'DELAY', reason: `Wind may reach ${fmt(wind, ' km/h')}. Spray only if it stays light.` }
  }
  return { recommendation: 'SUITABLE', reason: 'No strong rain or wind is shown. Spraying is possible if a product is already approved for this crop. Follow the label. No dose is given here.' }
}

function daySummary(d: WeatherDay) {
  const bits = [d.weather_condition].filter(Boolean) as string[]
  const tmin = fmt(n(d.temperature_min), '°C')
  const tmax = fmt(n(d.temperature_max), '°C')
  if (tmin && tmax) bits.push(`${tmin} to ${tmax}`)
  const mm = rainMm(d)
  if (mm != null) bits.push(`${fmt(mm, ' mm')} rain`)
  const p = n(d.precipitation_probability)
  if (p != null) bits.push(`${Math.round(p)}% chance of rain`)
  const wind = n(d.wind_speed)
  if (wind != null) bits.push(`wind ${fmt(wind, ' km/h')}`)
  const hum = n(d.humidity)
  if (hum != null) bits.push(`humidity ${Math.round(hum)}%`)
  return bits.join(' · ') || 'Forecast fields for this day are limited.'
}

function cropImpact(d: WeatherDay, input: FarmWeatherInput, wetStreak: number) {
  const crop = cropLabel(input)
  const mm = rainMm(d)
  const tmax = n(d.temperature_max)
  const tmin = n(d.temperature_min)
  if (mm != null && mm >= VERY_HEAVY_MM) {
    return `Very heavy rain may waterlog ${crop}, slow field access, and raise lodging risk if the crop is tall.`
  }
  if (mm != null && mm >= HEAVY_MM) {
    return `Heavy rain may wet the root zone of ${crop}. Check drains. Avoid walking the field if soil is soft.`
  }
  if (tmax != null && tmax >= VERY_HOT) {
    return `High temperature may stress ${crop}${establishment(input) ? ', especially young plants' : ''}.`
  }
  if (tmin != null && tmin <= FROST) {
    return `Low night temperature may injure ${crop}.`
  }
  if (wetStreak >= 3) {
    return `Several wet days may keep ${crop} leaves wet and raise fungal disease risk.`
  }
  if (mm != null && mm < 1 && tmax != null && tmax >= HOT) {
    return `Hot and dry weather may increase water need for ${crop}.`
  }
  return `No strong weather shock is shown for ${crop} on this day. Forecasts can still change.`
}

export function buildWeatherAdvisory(input: FarmWeatherInput): WeatherAdvisory {
  const missing = missingList(input)
  const days = input.forecast?.days ?? []
  if (!input.forecast || !days.length) {
    return {
      overall_risk: 'LOW',
      summary: input.forecast_error
        ? `Weather could not be loaded: ${input.forecast_error}`
        : 'No weather forecast was available, so no weather-related action can be advised.',
      priority_actions: [
        {
          priority: 1,
          action: input.latitude == null ? 'Draw the farm boundary or set a map pin so weather can be requested.' : 'Retry the weather page once the forecast service is reachable.',
          reason: input.forecast_error || 'The advisory engine does not invent weather values.',
          recommended_date: todayIso(),
          urgency: 'HIGH',
        },
      ],
      daily_advisory: [],
      weather_risks: [],
      best_operation_windows: [],
      farmer_message: input.forecast_error
        ? `Weather advisory for ${cropLabel(input)} is not ready. ${input.forecast_error}`
        : `Weather advisory for ${cropLabel(input)} is not ready. Add a farm boundary or map pin, then open Weather again.`,
      confidence: 'LOW',
      missing_information: missing,
    }
  }

  const wetStreaks: number[] = []
  let streak = 0
  for (const d of days) {
    streak = wet(d) ? streak + 1 : 0
    wetStreaks.push(streak)
  }

  const daily_advisory = days.map((d, i) => {
    const next = days[i + 1]
    const irrigation = irrigationForDay(d, input, next)
    const fertilizer = fertilizerForDay(d, next)
    const spraying = sprayingForDay(d)
    const disease_risk = diseaseForDay(d, wetStreaks[i] ?? 0)
    const pest_risk = pestForDay(d, input)
    const mm = rainMm(d)
    const ops: { operation: string; recommendation: string; reason: string }[] = []
    if (mm != null && mm >= HEAVY_MM) {
      ops.push({
        operation: 'Field work',
        recommendation: 'Avoid walking or cultivating wet soil',
        reason: 'Heavy rain can compact soil and damage roots.',
      })
      ops.push({
        operation: 'Drainage',
        recommendation: 'Keep outlets open',
        reason: 'Water should be able to leave low spots.',
      })
    } else if (spraying.recommendation === 'SUITABLE') {
      ops.push({ operation: 'Spraying', recommendation: 'Possible if already planned', reason: spraying.reason })
    }
    if (fertilizer.recommendation === 'APPLY') {
      ops.push({ operation: 'Fertilizer', recommendation: 'Possible if the crop needs it', reason: fertilizer.reason })
    }
    if (lateSeason(input) && (mm == null || mm < 2) && (n(d.precipitation_probability) ?? 0) < 40) {
      ops.push({
        operation: 'Harvest / drying',
        recommendation: 'Plan harvest or drying if the crop is ready',
        reason: 'A drier day is shown. Maturity must still be checked in the field.',
      })
    }
    if (!ops.length) {
      ops.push({
        operation: 'General',
        recommendation: 'No extra weather-driven field job',
        reason: 'Continue normal checks.',
      })
    }
    return {
      date: d.date,
      weather_summary: daySummary(d),
      crop_impact: cropImpact(d, input, wetStreaks[i] ?? 0),
      irrigation,
      fertilizer,
      spraying,
      disease_risk,
      pest_risk,
      farm_operations: ops,
    }
  })

  const weather_risks: WeatherAdvisory['weather_risks'] = []
  for (const d of days) {
    const mm = rainMm(d)
    const tmax = n(d.temperature_max)
    const tmin = n(d.temperature_min)
    const wind = n(d.wind_speed)
    if (mm != null && mm >= VERY_HEAVY_MM) {
      weather_risks.push({
        risk: 'Very heavy rainfall',
        severity: 'CRITICAL',
        expected_date: d.date,
        crop_impact: 'Waterlogging, soil erosion, and lodging are possible.',
        recommended_action: 'Stay safe. Keep people out of flowing water. Open drains. Do not irrigate.',
      })
    } else if (mm != null && mm >= HEAVY_MM) {
      weather_risks.push({
        risk: 'Heavy rainfall',
        severity: 'HIGH',
        expected_date: d.date,
        crop_impact: 'Standing water and poor field access are possible.',
        recommended_action: 'Check drainage before the rain. Skip irrigation and spray.',
      })
    }
    if (tmax != null && tmax >= EXTREME_HOT) {
      weather_risks.push({
        risk: 'Extreme heat',
        severity: 'CRITICAL',
        expected_date: d.date,
        crop_impact: 'Heat stress and faster soil drying.',
        recommended_action: 'Avoid mid-day field work. Irrigate only if rain is not expected and soil is dry.',
      })
    } else if (tmax != null && tmax >= VERY_HOT) {
      weather_risks.push({
        risk: 'High temperature',
        severity: 'HIGH',
        expected_date: d.date,
        crop_impact: 'Crop heat stress is possible.',
        recommended_action: 'Work early or late. Do not spray in the hottest hours.',
      })
    }
    if (tmin != null && tmin <= FROST) {
      weather_risks.push({
        risk: 'Cold / frost risk',
        severity: 'HIGH',
        expected_date: d.date,
        crop_impact: 'Tender growth may be injured.',
        recommended_action: 'Protect young plants if you have covers. Ask a local officer if unsure.',
      })
    } else if (tmin != null && tmin <= COOL) {
      weather_risks.push({
        risk: 'Low temperature',
        severity: 'MODERATE',
        expected_date: d.date,
        crop_impact: 'Growth may slow.',
        recommended_action: 'Monitor tender crops. No chemical action from weather alone.',
      })
    }
    if (wind != null && wind >= 40) {
      weather_risks.push({
        risk: 'Strong wind',
        severity: 'HIGH',
        expected_date: d.date,
        crop_impact: 'Lodging or physical damage is possible.',
        recommended_action: 'Avoid spraying. Keep people and equipment safe.',
      })
    }
  }

  const maxWet = Math.max(0, ...wetStreaks)
  if (maxWet >= 3) {
    const idx = wetStreaks.findIndex((s) => s >= 3)
    weather_risks.push({
      risk: 'Extended wet period',
      severity: 'MODERATE',
      expected_date: days[idx]?.date ?? days[0].date,
      crop_impact: 'Leaves stay wet longer, which can raise fungal disease risk.',
      recommended_action: 'After the wet spell, walk the crop and look for spots. Do not assume disease is already present.',
    })
  }

  const dryHot = days.filter((d) => (rainMm(d) ?? 0) < 1 && (n(d.temperature_max) ?? 0) >= HOT)
  if (dryHot.length >= 3) {
    weather_risks.push({
      risk: 'Extended dry, hot period',
      severity: 'MODERATE',
      expected_date: dryHot[0].date,
      crop_impact: 'Soil may dry faster and water need may rise.',
      recommended_action: 'Check soil before irrigating. Do not irrigate on a day that later shows useful rain.',
    })
  }

  let overall_risk: RiskLevel = 'LOW'
  if (weather_risks.some((r) => r.severity === 'CRITICAL')) overall_risk = 'CRITICAL'
  else if (weather_risks.some((r) => r.severity === 'HIGH')) overall_risk = 'HIGH'
  else if (
    weather_risks.some((r) => r.severity === 'MODERATE') ||
    daily_advisory.some((d) => d.disease_risk.level === 'HIGH' || d.irrigation.recommendation !== 'CONTINUE' && d.irrigation.recommendation !== 'NO_CHANGE')
  ) {
    overall_risk = 'MODERATE'
  }

  const windows: WeatherAdvisory['best_operation_windows'] = []
  const firstDrySpray = daily_advisory.find((d) => d.spraying.recommendation === 'SUITABLE')
  if (firstDrySpray) {
    windows.push({
      operation: 'SPRAYING',
      recommended_date: firstDrySpray.date,
      preferred_time: 'Morning or evening, when wind is light',
      reason: firstDrySpray.spraying.reason,
    })
  }
  const firstFert = daily_advisory.find((d) => d.fertilizer.recommendation === 'APPLY')
  if (firstFert) {
    windows.push({
      operation: 'FERTILIZER',
      recommended_date: firstFert.date,
      preferred_time: 'Morning',
      reason: firstFert.fertilizer.reason,
    })
  }
  const irrigDay = daily_advisory.find((d) => d.irrigation.recommendation === 'INCREASE' || d.irrigation.recommendation === 'CONTINUE')
  if (irrigDay && !daily_advisory.some((d) => d.irrigation.recommendation === 'SKIP' || d.irrigation.recommendation === 'AVOID')) {
    windows.push({
      operation: 'IRRIGATION',
      recommended_date: irrigDay.date,
      preferred_time: 'Early morning or evening',
      reason: irrigDay.irrigation.reason,
    })
  }
  const harvestDay = daily_advisory.find((d) => d.farm_operations.some((o) => o.operation.startsWith('Harvest')))
  if (harvestDay && lateSeason(input)) {
    windows.push({
      operation: 'HARVESTING',
      recommended_date: harvestDay.date,
      preferred_time: 'After dew dries',
      reason: 'A drier day is shown. Confirm the crop is ready before harvest.',
    })
  }

  const actions: WeatherAdvisory['priority_actions'] = []
  const firstHeavy = days.find((d) => (rainMm(d) ?? 0) >= HEAVY_MM)
  if (firstHeavy) {
    actions.push({
      priority: actions.length + 1,
      action: `Check field drainage and skip irrigation before ${firstHeavy.date}.`,
      reason: `${fmt(rainMm(firstHeavy), ' mm')} rain is in the forecast.`,
      recommended_date: firstHeavy.date,
      urgency: (rainMm(firstHeavy) ?? 0) >= VERY_HEAVY_MM ? 'CRITICAL' : 'HIGH',
    })
  }
  const firstSkip = daily_advisory.find((d) => d.irrigation.recommendation === 'SKIP' || d.irrigation.recommendation === 'AVOID' || d.irrigation.recommendation === 'DELAY')
  if (firstSkip && !firstHeavy) {
    actions.push({
      priority: actions.length + 1,
      action: `${firstSkip.irrigation.recommendation === 'DELAY' ? 'Delay' : 'Skip'} irrigation on ${firstSkip.date}.`,
      reason: firstSkip.irrigation.reason,
      recommended_date: firstSkip.date,
      urgency: 'HIGH',
    })
  }
  const firstAvoidSpray = daily_advisory.find((d) => d.spraying.recommendation === 'AVOID' || d.spraying.recommendation === 'DELAY')
  if (firstAvoidSpray) {
    actions.push({
      priority: actions.length + 1,
      action: `Do not spray on ${firstAvoidSpray.date}.`,
      reason: firstAvoidSpray.spraying.reason,
      recommended_date: firstAvoidSpray.date,
      urgency: 'MEDIUM',
    })
  }
  const firstDisease = daily_advisory.find((d) => d.disease_risk.level !== 'LOW')
  if (firstDisease) {
    actions.push({
      priority: actions.length + 1,
      action: `After wet weather, inspect ${cropLabel(input)} leaves for early disease signs.`,
      reason: firstDisease.disease_risk.reason,
      recommended_date: firstDisease.date,
      urgency: firstDisease.disease_risk.level === 'HIGH' ? 'HIGH' : 'MEDIUM',
    })
  }
  const firstHeat = days.find((d) => (n(d.temperature_max) ?? 0) >= VERY_HOT)
  if (firstHeat) {
    actions.push({
      priority: actions.length + 1,
      action: 'Avoid mid-day field work and check soil before extra irrigation.',
      reason: `High ${fmt(n(firstHeat.temperature_max), '°C')} is forecast.`,
      recommended_date: firstHeat.date,
      urgency: (n(firstHeat.temperature_max) ?? 0) >= EXTREME_HOT ? 'CRITICAL' : 'MEDIUM',
    })
  }
  if (!actions.length) {
    actions.push({
      priority: 1,
      action: 'No weather-related action is required. Continue normal field checks.',
      reason: 'The forecast does not show a strong problem for irrigation, spray, or crop safety.',
      recommended_date: days[0].date,
      urgency: 'LOW',
    })
  }

  if (overall_risk === 'LOW' && actions.some((a) => a.urgency !== 'LOW')) overall_risk = 'MODERATE'

  const rainDays = days.filter((d) => (rainMm(d) ?? 0) >= WET_MM)
  const likelyRainDays = days.filter((d) => (n(d.precipitation_probability) ?? 0) >= LIKELY_RAIN)
  const rainTotal = days.reduce((s, d) => s + (rainMm(d) ?? 0), 0)
  const crop = cropLabel(input)
  const loc = input.farm_name || [input.district, input.state].filter(Boolean).join(', ') || 'the farm'
  let farmer_message = `${crop} advisory for the next ${days.length} days at ${loc}: `
  if (firstHeavy) {
    farmer_message += `Rain of ${fmt(rainMm(firstHeavy), ' mm')} is forecast on ${firstHeavy.date}. Avoid irrigation and check that water can leave the field. Do not spray before that rain. `
  } else if (rainDays.length) {
    farmer_message += `Some rain is shown (${fmt(rainTotal, ' mm')} total across the period). Adjust irrigation on wetter days. `
  } else if (likelyRainDays.length) {
    farmer_message += `Rain amounts look small, but rain chance is high on ${likelyRainDays
      .slice(0, 3)
      .map((d) => d.date)
      .join(', ')}. Delay spraying on those days. `
  } else {
    farmer_message += 'No useful rain is shown in this forecast. '
    const hot = days.filter((d) => (n(d.temperature_max) ?? 0) >= HOT)
    if (hot.length) farmer_message += 'Some days look hot and dry, so check the soil before you irrigate. '
  }
  if (firstDisease && firstDisease.disease_risk.level !== 'LOW') {
    farmer_message += 'After wet hours, look at the leaves for disease signs. Weather only shows risk, not that disease is already there. '
  }
  if (firstDrySpray) farmer_message += `A better spray window looks like ${firstDrySpray.date}, if spraying is already planned. `
  if (overall_risk === 'LOW' && actions[0]?.urgency === 'LOW') {
    farmer_message += 'No extra weather-related action is required right now. Forecasts can change.'
  } else {
    farmer_message += 'This is a forecast, not a guarantee. Ask a local agriculture officer if you are unsure.'
  }

  const rainNote = rainTotal > 0 ? `${fmt(rainTotal, ' mm')} total rain is shown` : 'little or no rain is shown'
  const summary = `For ${crop} at ${input.farm_name || 'this farm'}, ${rainNote} over ${days.length} days. ${
    overall_risk === 'LOW' ? 'No major weather-related action is required.' : 'Use the priority actions for irrigation, spray, and field checks.'
  } Forecasts can change.`

  return {
    overall_risk,
    summary,
    priority_actions: actions.slice(0, 5).map((a, i) => ({ ...a, priority: i + 1 })),
    daily_advisory,
    weather_risks,
    best_operation_windows: windows,
    farmer_message: farmer_message.trim(),
    confidence: confidence(input, days.length),
    missing_information: missing,
  }
}
