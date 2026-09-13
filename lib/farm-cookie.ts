'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { FARM_COOKIE } from '@/lib/context'
import { requireFarm } from '@/lib/access'
import { cookieSecure } from '@/lib/security'

export async function selectFarmAction(farmId: string) {
  await requireFarm(farmId)
  const jar = await cookies()
  jar.set(FARM_COOKIE, farmId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure(),
    maxAge: 60 * 60 * 24 * 180,
  })
  revalidatePath('/app', 'layout')
}

export async function openFarmAction(farmId: string) {
  await selectFarmAction(farmId)
  redirect(`/app/farms/${farmId}`)
}
