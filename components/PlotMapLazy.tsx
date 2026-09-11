'use client'

import dynamic from 'next/dynamic'

export const PlotMapLazy = dynamic(() => import('./PlotMap').then((m) => m.PlotMap), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-border bg-white text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
})
