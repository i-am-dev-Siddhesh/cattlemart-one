'use client'

import { useRouter } from 'next/navigation'
import { Card, CardHint, CardTitle } from '@/components/ui/card'
import { Table, Td, Th } from '@/components/ui/table'

export type HealthRow = {
  id: string
  plotId: string
  plotName: string
  date: string
  kind: string
  name: string
  level: 'action' | 'watch' | 'minor'
}

const LEVEL = {
  action: { word: 'Needs action', dot: '#e11d48', chip: 'bg-[#fff1f2] text-[#9f1239]' },
  watch: { word: 'Keep watching', dot: '#d97706', chip: 'bg-[#fffbeb] text-[#92400e]' },
  minor: { word: 'Minor', dot: '#64748b', chip: 'bg-[#f1f5f9] text-[#475569]' },
} as const

export function HealthCard({
  farmId,
  counts,
  rows,
}: {
  farmId: string
  counts: { ok: number; watch: number; action: number }
  rows: HealthRow[]
}) {
  const router = useRouter()

  return (
    <Card>
      <CardHint>Crop health</CardHint>
      <CardTitle>How the crop is doing</CardTitle>
      <div className="mt-4 grid grid-cols-3 gap-2 text-sm max-[420px]:grid-cols-1">
        <Box tone="ok" value={counts.ok} label="Plots fine" />
        <Box tone="watch" value={counts.watch} label="Watch" />
        <Box tone="action" value={counts.action} label="Needs action" />
      </div>

      {rows.length ? (
        <Table className="mt-4">
          <thead>
            <tr>
              <Th>Plot</Th>
              <Th>Problem</Th>
              <Th>How bad</Th>
              <Th className="text-right">When</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const level = LEVEL[r.level]
              return (
                <tr
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/app/farms/${farmId}/plots/${r.plotId}/health`)}
                >
                  <Td>{r.plotName}</Td>
                  <Td>
                    <span className="flex items-center gap-2">
                      <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: level.dot }} />
                      <span className="line-clamp-1">
                        {r.kind}: {r.name}
                      </span>
                    </span>
                  </Td>
                  <Td>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${level.chip}`}>{level.word}</span>
                  </Td>
                  <Td className="text-right">{r.date.slice(0, 10)}</Td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No pest or disease notes yet. Use Log entry → Health when you see a problem.
        </p>
      )}
    </Card>
  )
}

function Box({ tone, value, label }: { tone: 'ok' | 'watch' | 'action'; value: number; label: string }) {
  const bg = tone === 'ok' ? 'bg-[#f0fdf4]' : tone === 'watch' ? 'bg-[#fffbeb]' : 'bg-[#fff1f2]'
  return (
    <div className={`rounded-lg p-3 ${bg}`}>
      <p className="num text-xl font-semibold">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
