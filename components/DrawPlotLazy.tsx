'use client'

import dynamic from 'next/dynamic'

export const DrawPlotLazy = dynamic(() => import('./DrawPlot').then((m) => m.DrawPlot), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-border bg-white p-6 text-sm text-muted-foreground">Loading farm map…</div>
  ),
})
