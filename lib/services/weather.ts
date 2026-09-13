export type WeatherDay = {
  date: string
  temperature_min: number | null
  temperature_max: number | null
  precipitation: number | null
  precipitation_probability: number | null
  rainfall: number | null
  humidity: number | null
  wind_speed: number | null
  wind_direction: number | null
  soil_moisture: number | null
  evapotranspiration: number | null
  uv_index: number | null
  weather_code: number | null
  weather_condition: string | null
}

export type WeatherForecast = {
  provider: 'Open-Meteo'
  location: { lat: number; lng: number; source: string }
  generated_at: string
  timezone: string
  forecast_days: number
  days: WeatherDay[]
}

type OpenMeteoResponse = {
  timezone?: string
  daily?: {
    time: string[]
    weather_code?: number[]
    temperature_2m_max?: number[]
    temperature_2m_min?: number[]
    precipitation_sum?: number[]
    precipitation_probability_max?: number[]
    rain_sum?: number[]
    wind_speed_10m_max?: number[]
    wind_direction_10m_dominant?: number[]
    et0_fao_evapotranspiration?: number[]
    uv_index_max?: number[]
  }
  hourly?: {
    time: string[]
    relative_humidity_2m?: number[]
    soil_moisture_0_to_7cm?: number[]
  }
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function mean(values: number[]): number | null {
  if (!values.length) return null
  return values.reduce((s, n) => s + n, 0) / values.length
}

function conditionFromCode(code: number | null): string | null {
  if (code == null) return null
  if (code === 0) return 'Clear'
  if (code <= 3) return 'Partly cloudy'
  if (code === 45 || code === 48) return 'Fog'
  if (code >= 51 && code <= 57) return 'Drizzle'
  if (code >= 61 && code <= 67) return 'Rain'
  if (code >= 71 && code <= 77) return 'Snow'
  if (code >= 80 && code <= 82) return 'Rain showers'
  if (code >= 95) return 'Thunderstorm'
  return `Weather code ${code}`
}

function hourlyByDate(times: string[], values: number[] | undefined, date: string): number[] {
  if (!values) return []
  const out: number[] = []
  for (let i = 0; i < times.length; i++) {
    if (times[i]?.startsWith(date) && typeof values[i] === 'number') out.push(values[i])
  }
  return out
}

export async function fetchOpenMeteoForecast(lat: number, lng: number, days = 7): Promise<WeatherForecast> {
  const forecastDays = Math.min(16, Math.max(1, days))
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', lat.toFixed(5))
  url.searchParams.set('longitude', lng.toFixed(5))
  url.searchParams.set('timezone', 'Asia/Kolkata')
  url.searchParams.set('forecast_days', String(forecastDays))
  url.searchParams.set(
    'daily',
    [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'precipitation_probability_max',
      'rain_sum',
      'wind_speed_10m_max',
      'wind_direction_10m_dominant',
      'et0_fao_evapotranspiration',
      'uv_index_max',
    ].join(','),
  )
  url.searchParams.set('hourly', 'relative_humidity_2m,soil_moisture_0_to_7cm')

  const res = await fetch(url.toString(), { next: { revalidate: 1800 } })
  if (!res.ok) {
    throw new Error(`Weather request failed (${res.status}). Try again later.`)
  }
  const data = (await res.json()) as OpenMeteoResponse
  const daily = data.daily
  if (!daily?.time?.length) {
    throw new Error('Weather provider returned no daily forecast.')
  }

  const forecast: WeatherDay[] = daily.time.map((date, i) => {
    const code = num(daily.weather_code?.[i])
    const rain = num(daily.rain_sum?.[i])
    const precip = num(daily.precipitation_sum?.[i])
    return {
      date,
      temperature_min: num(daily.temperature_2m_min?.[i]),
      temperature_max: num(daily.temperature_2m_max?.[i]),
      precipitation: precip,
      precipitation_probability: num(daily.precipitation_probability_max?.[i]),
      rainfall: rain ?? precip,
      humidity: mean(hourlyByDate(data.hourly?.time ?? [], data.hourly?.relative_humidity_2m, date)),
      wind_speed: num(daily.wind_speed_10m_max?.[i]),
      wind_direction: num(daily.wind_direction_10m_dominant?.[i]),
      soil_moisture: mean(hourlyByDate(data.hourly?.time ?? [], data.hourly?.soil_moisture_0_to_7cm, date)),
      evapotranspiration: num(daily.et0_fao_evapotranspiration?.[i]),
      uv_index: num(daily.uv_index_max?.[i]),
      weather_code: code,
      weather_condition: conditionFromCode(code),
    }
  })

  return {
    provider: 'Open-Meteo',
    location: { lat, lng, source: '' },
    generated_at: new Date().toISOString(),
    timezone: data.timezone || 'Asia/Kolkata',
    forecast_days: forecast.length,
    days: forecast,
  }
}
