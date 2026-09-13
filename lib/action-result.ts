import { isNextNavigationError, userFacingActionError } from '@/lib/utils'

export type ActionFailure = { __actionError: string }

export function actionFailure(message: string): ActionFailure {
  return { __actionError: message }
}

export function actionFailureMessage(value: unknown) {
  if (value && typeof value === 'object' && '__actionError' in value) {
    const message = String((value as ActionFailure).__actionError ?? '').trim()
    return message || null
  }
  return null
}

export async function runAction<T>(work: () => Promise<T>): Promise<T | ActionFailure> {
  try {
    return await work()
  } catch (err) {
    if (isNextNavigationError(err)) throw err
    return actionFailure(userFacingActionError(err))
  }
}
