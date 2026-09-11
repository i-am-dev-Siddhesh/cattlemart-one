import { useState } from 'react'
import { Button } from '../components/ui'
import { currentCycle } from '../finance'
import { interpret, type FarmOSIntent } from '../farmos'
import { useFarmStore } from '../store'

type Bubble = { role: 'farmer' | 'os'; text: string; pending?: FarmOSIntent }

export function AssistantPage() {
  const state = useFarmStore()
  const [input, setInput] = useState('')
  const [log, setLog] = useState<Bubble[]>([
    {
      role: 'os',
      text: 'FarmOS AI. I read this farm’s book only — no invented GPS, soil numbers, spray doses, or mandi prices. Try: “How many acres do I have?”, “What was grown on Plot A last year?”, “How much urea do I have?”, or “Today I spent ₹4500 on fertilizer for Plot A.”',
    },
  ])

  const speak = (text: string) => {
    const reply = interpret(text, useFarmStore.getState())
    setLog((l) => [...l, { role: 'farmer', text }, { role: 'os', text: reply.text, pending: reply.needsConfirm ? reply.intent : undefined }])
  }

  const save = (intent: FarmOSIntent) => {
    const msg = commitIntent(intent)
    setLog((l) => [...l, { role: 'os', text: msg }])
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>FarmOS AI</h2>
          <p className="lede">
            Natural language into the chain: farm → plot → crop cycle → activity → cost → observation → harvest. Money
            and chemicals wait for yes.
          </p>
        </div>
      </div>
      <div className="card chat-log">
        {log.map((b, i) => (
          <div key={i} className={`bubble ${b.role}`}>
            <pre>{b.text}</pre>
            {b.pending && b.pending.kind !== 'ask' && b.pending.kind !== 'unknown' && (
              <div className="row">
                <Button small onClick={() => save(b.pending!)}>
                  Yes, save
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
      <form
        className="row"
        style={{ marginTop: 12 }}
        onSubmit={(e) => {
          e.preventDefault()
          if (!input.trim()) return
          speak(input.trim())
          setInput('')
        }}
      >
        <input
          style={{ flex: 1 }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the book, or record a day…"
        />
        <Button type="submit">Send</Button>
      </form>
      <p className="lede">
        Role on this device: {state.settings.role}. Viewer/accountant limits are not enforced in this local book yet —
        treat it as the owner’s notebook.
      </p>
    </div>
  )
}

function commitIntent(intent: FarmOSIntent): string {
  const s = useFarmStore.getState()
  const farm = s.farms.find((f) => f.id === s.activeFarmId) ?? s.farms[0]
  if (intent.kind === 'expense' && intent.plotId && intent.amount && intent.category) {
    s.addExpense({
      plotId: intent.plotId,
      cropCycleId: currentCycle(s.cropCycles, intent.plotId)?.id ?? null,
      activityId: null,
      category: intent.category,
      amount: intent.amount,
      date: intent.date,
      vendor: '',
      notes: intent.notes,
    })
    return 'Expense saved on that plot. Farm totals will add it up from the plot book.'
  }
  if (intent.kind === 'diary') {
    if (!farm) return 'No farm to hang a diary on.'
    s.addDiary({
      farmId: farm.id,
      plotId: intent.plotId ?? null,
      date: intent.date,
      text: intent.text,
      structured: intent.plotId ? `Linked to a named plot.` : 'Plot not inferred.',
    })
    return 'Diary kept with your wording.'
  }
  if (intent.kind === 'task') {
    if (!farm) return 'No farm.'
    s.addTask({
      farmId: farm.id,
      plotId: intent.plotId ?? null,
      title: intent.title,
      dueDate: intent.dueDate,
      priority: 'medium',
      status: 'pending',
      assignee: s.user.name,
      notes: '',
    })
    return 'Task saved.'
  }
  if (intent.kind === 'pest' && intent.plotId) {
    s.addPest({
      plotId: intent.plotId,
      cropCycleId: currentCycle(s.cropCycles, intent.plotId)?.id ?? null,
      name: intent.name,
      date: intent.date,
      severity: 'not scored',
      affectedPct: null,
      symptoms: intent.name,
      action: '',
      confidence: 'possible',
      notes: 'Entered from speech/text. Not confirmed.',
    })
    return 'Scouting note saved as possible — not a confirmed pest ID.'
  }
  if (intent.kind === 'disease' && intent.plotId) {
    s.addDisease({
      plotId: intent.plotId,
      cropCycleId: currentCycle(s.cropCycles, intent.plotId)?.id ?? null,
      name: intent.name,
      date: intent.date,
      severity: 'not scored',
      symptoms: intent.name,
      treatment: '',
      confidence: 'possible',
      notes: 'Not confirmed by lab or expert.',
    })
    return 'Disease note saved as possible. History on this plot is kept.'
  }
  if (intent.kind === 'irrigation' && intent.plotId) {
    s.addIrrigation({
      plotId: intent.plotId,
      cropCycleId: currentCycle(s.cropCycles, intent.plotId)?.id ?? null,
      date: intent.date,
      method: 'Not recorded',
      hours: intent.hours ?? null,
      quantity: null,
      unit: 'hour',
      cost: 0,
      source: '',
      notes: '',
    })
    return 'Irrigation row saved. Litres remain unknown unless you add them later.'
  }
  if (intent.kind === 'harvest' && intent.plotId && intent.qty) {
    s.addHarvest({
      plotId: intent.plotId,
      cropCycleId: currentCycle(s.cropCycles, intent.plotId)?.id ?? null,
      date: intent.date,
      batch: `H-${Date.now().toString(36)}`,
      quantity: intent.qty,
      unit: 'quintal',
      grade: '',
      marketable: intent.qty,
      notes: 'Unit assumed quintal because it was not stated. Correct the row if that is wrong.',
    })
    return 'Harvest batch saved. Unit assumed quintal — say if that is wrong.'
  }
  return 'Nothing saved.'
}
