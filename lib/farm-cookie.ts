'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { FARM_COOKIE } from '@/lib/context'

export async function selectFarmAction(farmId: string) {
  const jar = await cookies()
  jar.set(FARM_COOKIE, farmId, { path: '/' })
  revalidatePath('/app', 'layout')
}
