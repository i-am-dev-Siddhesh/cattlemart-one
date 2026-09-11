'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Result = {
  plots: { id: string; name: string; farmId: string; code: string }[]
  activities: { id: string; type: string; plot: { name: string } }[]
  expenses: { id: string; category: string; amount: number }[]
  crops: { id: string; name: string }[]
}

export function GlobalSearch({ farmId }: { farmId: string }) {
  const [q, setQ] = useState('')
  const [data, setData] = useState<Result | null>(null)

  useEffect(() => {
    if (q.length < 2) {
      setData(null)
      return
    }
    const t = setTimeout(() => {
      void fetch(`/api/search?farmId=${farmId}&q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then(setData)
    }, 200)
    return () => clearTimeout(t)
  }, [q, farmId])

  return (
    <div className="relative min-w-[220px] flex-1">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search plots, crops, activities…"
        className="control"
      />
      {data ? (
        <div className="absolute z-30 mt-1 w-full rounded-xl border border-border bg-white p-3 text-sm shadow-lg">
          {data.plots.map((p) => (
            <Link key={p.id} href={`/app/farms/${p.farmId}/plots/${p.id}`} className="block py-1">
              {p.name} · {p.code}
            </Link>
          ))}
          {data.crops.map((c) => (
            <p key={c.id} className="py-1 text-muted-foreground">
              Crop · {c.name}
            </p>
          ))}
          {data.activities.map((a) => (
            <p key={a.id} className="py-1 text-muted-foreground">
              {a.type} · {a.plot.name}
            </p>
          ))}
          {!data.plots.length && !data.crops.length && !data.activities.length ? (
            <p className="text-muted-foreground">No matches in this farm book.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
