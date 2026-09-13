import { format } from 'date-fns'
import { Card, CardHint, CardTitle } from '@/components/ui/card'
import { Table, Td, Th } from '@/components/ui/table'
import type { WeatherPageData } from '@/lib/services/weather-context'

const RISK: Record<string, string> = {
  LOW: 'bg-[#ecfdf3] text-[#166534]',
  MODERATE: 'bg-[#fffbeb] text-[#92400e]',
  HIGH: 'bg-[#fff1f2] text-[#9f1239]',
  CRITICAL: 'bg-[#9f1239] text-white',
  MEDIUM: 'bg-[#fffbeb] text-[#92400e]',
}

function Chip({ value }: { value: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RISK[value] ?? 'bg-[#f1f5f9] text-[#475569]'}`}>{value}</span>
}

function sourceLabel(source: string | null | undefined) {
  if (source === 'farm_boundary') return 'centre of the farm boundary'
  if (source === 'plot_boundaries') return 'centre of the plot outlines'
  if (source === 'farm_pin') return 'farm map pin'
  return 'farm location'
}

function prettyDay(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime()) ? iso : format(d, 'EEE d MMM')
}

export function WeatherAdvisoryView({ data }: { data: WeatherPageData }) {
  const { advisory, forecast, point, input } = data
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardHint>Weather advisory</CardHint>
            <CardTitle>{input.farm_name || 'Farm'}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {input.crop_name ? `Main crop: ${input.crop_name}${input.crop_variety ? ` · ${input.crop_variety}` : ''}` : 'No active crop recorded.'}
              {input.growth_stage ? ` · ${input.growth_stage}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Chip value={advisory.overall_risk} />
            <span className="text-xs text-muted-foreground">Confidence {advisory.confidence}</span>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6">{advisory.farmer_message}</p>
        <p className="mt-3 text-xs text-muted-foreground">
          {point
            ? `Forecast for the ${sourceLabel(point.source)} (${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}). ${forecast ? `${forecast.provider} · ${forecast.forecast_days} days · Asia/Kolkata. Predictions can change.` : ''}`
            : 'Draw the farm on the map so this page can request weather for your land.'}
        </p>
      </Card>

      <Card>
        <CardHint>Do this first</CardHint>
        <CardTitle>Priority actions</CardTitle>
        <ol className="mt-3 space-y-3">
          {advisory.priority_actions.map((a) => (
            <li key={`${a.priority}-${a.recommended_date}`} className="flex gap-3 text-sm">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#eeedff] text-xs font-semibold text-primary">
                {a.priority}
              </span>
              <div>
                <p className="font-medium">{a.action}</p>
                <p className="mt-0.5 text-muted-foreground">
                  {prettyDay(a.recommended_date)} · <Chip value={a.urgency} /> · {a.reason}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      {advisory.weather_risks.length ? (
        <Card>
          <CardHint>Watch the sky</CardHint>
          <CardTitle>Weather risks</CardTitle>
          <Table className="mt-3">
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Risk</Th>
                <Th>Severity</Th>
                <Th>What to do</Th>
              </tr>
            </thead>
            <tbody>
              {advisory.weather_risks.map((r) => (
                <tr key={`${r.risk}-${r.expected_date}`}>
                  <Td>{prettyDay(r.expected_date)}</Td>
                  <Td>
                    <p>{r.risk}</p>
                    <p className="text-xs text-muted-foreground">{r.crop_impact}</p>
                  </Td>
                  <Td>
                    <Chip value={r.severity} />
                  </Td>
                  <Td>{r.recommended_action}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : null}

      {advisory.daily_advisory.length ? (
        <Card>
          <CardHint>Day by day</CardHint>
          <CardTitle>Farm actions</CardTitle>
          <div className="mt-3 overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th>Day</Th>
                  <Th>Weather</Th>
                  <Th>Irrigate</Th>
                  <Th>Fertilizer</Th>
                  <Th>Spray</Th>
                  <Th>Disease risk</Th>
                </tr>
              </thead>
              <tbody>
                {advisory.daily_advisory.map((d) => (
                  <tr key={d.date}>
                    <Td className="whitespace-nowrap font-medium">{prettyDay(d.date)}</Td>
                    <Td className="min-w-[12rem]">
                      <p>{d.weather_summary}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{d.crop_impact}</p>
                    </Td>
                    <Td>
                      <Chip value={d.irrigation.recommendation} />
                      <p className="mt-1 text-xs text-muted-foreground">{d.irrigation.reason}</p>
                    </Td>
                    <Td>
                      <Chip value={d.fertilizer.recommendation} />
                      <p className="mt-1 text-xs text-muted-foreground">{d.fertilizer.reason}</p>
                    </Td>
                    <Td>
                      <Chip value={d.spraying.recommendation} />
                      <p className="mt-1 text-xs text-muted-foreground">{d.spraying.reason}</p>
                    </Td>
                    <Td>
                      <Chip value={d.disease_risk.level} />
                      <p className="mt-1 text-xs text-muted-foreground">{d.disease_risk.reason}</p>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      ) : null}

      {advisory.best_operation_windows.length ? (
        <Card>
          <CardHint>Better days</CardHint>
          <CardTitle>Operation windows</CardTitle>
          <Table className="mt-3">
            <thead>
              <tr>
                <Th>Work</Th>
                <Th>When</Th>
                <Th>Time</Th>
                <Th>Why</Th>
              </tr>
            </thead>
            <tbody>
              {advisory.best_operation_windows.map((w) => (
                <tr key={`${w.operation}-${w.recommended_date}`}>
                  <Td className="capitalize">{w.operation.toLowerCase()}</Td>
                  <Td>{prettyDay(w.recommended_date)}</Td>
                  <Td>{w.preferred_time}</Td>
                  <Td>{w.reason}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : null}

      {advisory.missing_information.length ? (
        <Card>
          <CardHint>Stronger advice later</CardHint>
          <CardTitle>Missing farm details</CardTitle>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {advisory.missing_information.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  )
}
