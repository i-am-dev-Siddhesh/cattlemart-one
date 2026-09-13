import { prisma } from '@/lib/prisma'

export type HealthLevel = 'action' | 'watch' | 'minor'

export type HealthIssue = {
  id: string
  plotId: string
  plotName: string
  date: Date
  kind: string
  name: string
  severity: string
  level: HealthLevel
}

const RECENT_DAYS = 45

export function healthLevel(severity: string): HealthLevel {
  const s = severity.trim().toLowerCase()
  if (['high', 'severe', 'critical', 'heavy'].includes(s)) return 'action'
  if (['moderate', 'medium'].includes(s)) return 'watch'
  return 'minor'
}

export const healthWords: Record<HealthLevel, string> = {
  action: 'Needs action',
  watch: 'Keep watching',
  minor: 'Minor',
}

/**
 * Pest, disease, and crop notes from every plot in one list, newest first,
 * plus a per-plot status so the dashboard can say how many plots are fine.
 */
export async function farmHealth(farmId: string) {
  const scope = { plot: { farmId } }
  const recentSince = new Date(Date.now() - RECENT_DAYS * 86400000)

  const [plots, pests, diseases, notes] = await Promise.all([
    prisma.plot.findMany({ where: { farmId }, select: { id: true, name: true } }),
    prisma.pestObservation.findMany({
      where: scope,
      include: { plot: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
      take: 30,
    }),
    prisma.diseaseObservation.findMany({
      where: scope,
      include: { plot: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
      take: 30,
    }),
    prisma.cropObservation.findMany({
      where: scope,
      include: { plot: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
      take: 30,
    }),
  ])

  const issues: HealthIssue[] = [
    ...pests.map((r) => ({
      id: r.id,
      plotId: r.plot.id,
      plotName: r.plot.name,
      date: r.date,
      kind: 'Pest',
      name: r.pest,
      severity: r.severity,
      level: healthLevel(r.severity),
    })),
    ...diseases.map((r) => ({
      id: r.id,
      plotId: r.plot.id,
      plotName: r.plot.name,
      date: r.date,
      kind: 'Disease',
      name: r.disease,
      severity: r.severity,
      level: healthLevel(r.severity),
    })),
    ...notes.map((r) => ({
      id: r.id,
      plotId: r.plot.id,
      plotName: r.plot.name,
      date: r.date,
      kind: 'Crop note',
      name: r.note,
      severity: r.severity,
      level: healthLevel(r.severity),
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime())

  const rank: Record<HealthLevel, number> = { minor: 1, watch: 2, action: 3 }
  const worst = new Map<string, HealthLevel>()
  for (const issue of issues) {
    if (issue.date < recentSince) continue
    const current = worst.get(issue.plotId)
    if (!current || rank[issue.level] > rank[current]) worst.set(issue.plotId, issue.level)
  }

  const plotStatus = plots.map((p) => ({ ...p, level: worst.get(p.id) ?? null }))

  return {
    issues: issues.slice(0, 12),
    plotStatus,
    counts: {
      ok: plotStatus.filter((p) => !p.level).length,
      watch: plotStatus.filter((p) => p.level === 'watch' || p.level === 'minor').length,
      action: plotStatus.filter((p) => p.level === 'action').length,
    },
  }
}
