'use client'

import { selectFarmAction } from '@/lib/farm-cookie'

export function FarmSelector({
  farms,
  currentId,
}: {
  farms: { id: string; name: string }[]
  currentId?: string
}) {
  return (
    <select
      defaultValue={currentId}
      className="control w-auto"
      onChange={(e) => {
        void selectFarmAction(e.target.value)
      }}
      aria-label="Farm"
    >
      {farms.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name}
        </option>
      ))}
    </select>
  )
}
