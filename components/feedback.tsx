'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { Check, Loader2, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, isNextNavigationError, userFacingActionError } from '@/lib/utils'

type Toast = { id: number; kind: 'ok' | 'err'; text: string }
type Result<T> = { ok: true; data: T } | { ok: false }

type Feedback = {
  busy: boolean
  run: <T>(work: () => Promise<T>, opts?: { ok?: string }) => Promise<Result<T>>
}

const Ctx = createContext<Feedback | null>(null)

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [busy, setBusy] = useState(0)
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((kind: 'ok' | 'err', text: string) => {
    const id = Date.now() + Math.random()
    setToasts((list) => [...list.slice(-4), { id, kind, text }])
    window.setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id))
    }, 4200)
  }, [])

  const run = useCallback(
    async <T,>(work: () => Promise<T>, opts?: { ok?: string }): Promise<Result<T>> => {
      setBusy((n) => n + 1)
      try {
        const data = await work()
        push('ok', opts?.ok ?? 'Saved')
        return { ok: true, data }
      } catch (err) {
        if (isNextNavigationError(err)) throw err
        push('err', userFacingActionError(err))
        return { ok: false }
      } finally {
        setBusy((n) => Math.max(0, n - 1))
      }
    },
    [push],
  )

  const value = useMemo(() => ({ busy: busy > 0, run }), [busy, run])

  return (
    <Ctx.Provider value={value}>
      {children}
      {busy > 0 ? (
        <>
          <div className="fixed inset-x-0 top-0 z-[90] h-1 overflow-hidden bg-[#eeedff]">
            <div className="h-full w-1/3 animate-pulse bg-primary" />
          </div>
          <div className="fixed inset-0 z-[80] grid place-items-center bg-[#0a2540]/25" aria-live="polite" aria-busy>
            <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium shadow-xl">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Working…
            </div>
          </div>
        </>
      ) : null}
      <div className="pointer-events-none fixed top-4 right-4 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'flex items-start gap-2 rounded-xl px-3 py-3 text-sm font-medium shadow-lg',
              t.kind === 'ok' ? 'bg-[#166534] text-white' : 'bg-destructive text-white',
            )}
          >
            {t.kind === 'ok' ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useFeedback() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('FeedbackProvider is missing.')
  return ctx
}

export function ActionForm({
  action,
  ok = 'Saved',
  className,
  children,
}: {
  action: (fd: FormData) => Promise<unknown>
  ok?: string
  className?: string
  children: ReactNode
}) {
  const { run } = useFeedback()
  return (
    <form
      className={className}
      action={async (fd) => {
        await run(() => action(fd), { ok })
      }}
    >
      {children}
    </form>
  )
}

export function SubmitButton({
  children,
  pendingLabel = 'Saving…',
  className,
  variant,
  size,
}: {
  children: ReactNode
  pendingLabel?: string
  className?: string
  variant?: ComponentProps<typeof Button>['variant']
  size?: ComponentProps<typeof Button>['size']
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className={className} variant={variant} size={size}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
