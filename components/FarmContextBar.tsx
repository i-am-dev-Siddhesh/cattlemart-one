'use client'

import { usePathname } from 'next/navigation'
import { FarmSelector } from '@/components/FarmSelector'
import { farmLocationLabel } from '@/lib/geocode'

export type FarmPlace = {
  id: string
  name: string
  village?: string | null
  district?: string | null
  state?: string | null
  country?: string | null
}

function farmIdFromPath(path: string) {
  const match = path.match(/^\/app\/farms\/([^/]+)/)
  return match?.[1]
}

export function FarmContextBar({ farms, currentId }: { farms: FarmPlace[]; currentId?: string }) {
  const path = usePathname() ?? ''
  const fromUrl = farmIdFromPath(path)
  const farm = farms.find((f) => f.id === fromUrl) ?? farms.find((f) => f.id === currentId) ?? farms[0]
  if (!farm) return <span className="hidden truncate md:inline">India</span>
  return (
    <div className="flex min-w-0 items-center gap-3">
      {farms.length > 1 ? (
        <FarmSelector
          key={farm.id}
          farms={farms}
          currentId={farm.id}
        />
      ) : null}
      <span className="hidden truncate md:inline">{farmLocationLabel(farm)}</span>
    </div>
  )
}
