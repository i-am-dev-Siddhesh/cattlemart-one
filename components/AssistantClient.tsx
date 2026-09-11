'use client'

import { useState, useTransition } from 'react'
import { assistantConfirmAction } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export function AssistantClient({ farmId }: { farmId: string }) {
  const [log, setLog] = useState<{ role: 'user' | 'farm'; text: string }[]>([])
  const [pending, start] = useTransition()

  return (
    <div className="space-y-4">
      <Card className="min-h-[240px] space-y-2 text-sm">
        {log.length === 0 ? (
          <p className="text-muted-foreground">Ask about Plot 02 cost, NPK stock, or last year’s crop.</p>
        ) : null}
        {log.map((m, i) => (
          <p key={i} className={m.role === 'user' ? 'font-medium' : 'whitespace-pre-wrap text-muted-foreground'}>
            {m.role === 'user' ? 'You · ' : 'FarmOS · '}
            {m.text}
          </p>
        ))}
      </Card>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          const text = String(fd.get('q') ?? '').trim()
          if (!text) return
          e.currentTarget.reset()
          start(async () => {
            const result = await assistantConfirmAction(farmId, text)
            let reply = ''
            if ('answer' in result && result.answer) reply = result.answer
            else if ('error' in result && result.error) reply = String(result.error)
            else if (result.saved)
              reply = 'Saved. Plot, finance, and inventory (if matched) were updated from this one record.'
            else if (result.parsed.kind === 'unknown') reply = result.parsed.reason
            else reply = JSON.stringify(result.parsed)
            setLog((l) => [...l, { role: 'user', text }, { role: 'farm', text: reply }])
          })
        }}
      >
        <Input name="q" className="flex-1" placeholder="Spent 4500 rupees on NPK for plot 2 today." />
        <Button disabled={pending}>{pending ? '…' : 'Send'}</Button>
      </form>
    </div>
  )
}
