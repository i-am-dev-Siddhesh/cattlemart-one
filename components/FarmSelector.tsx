'use client'

import { usePathname, useRouter } from 'next/navigation'
import { selectFarmAction } from '@/lib/farm-cookie'
import { useFeedback } from '@/components/feedback'
import { Select } from '@/components/ui/select'

export function FarmSelector({
  farms,
  currentId,
}: {
  farms: { id: string; name: string }[]
  currentId?: string
}) {
  const { run, busy } = useFeedback()
  const path = usePathname() ?? ''
  const router = useRouter()
  return (
    <Select
      defaultValue={currentId}
      disabled={busy}
      className="w-auto max-w-[12rem] truncate"
      onChange={(e) => {
        const id = e.target.value
        void run(async () => {
          await selectFarmAction(id)
          if (path.startsWith('/app/farms/')) router.push(`/app/farms/${id}`)
        }, { ok: 'Farm switched' })
      }}
      aria-label="Farm"
    >
      {farms.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name}
        </option>
      ))}
    </Select>
  )
}
