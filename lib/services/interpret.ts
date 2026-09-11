export type ProposedRecord =
  | {
      kind: 'expense'
      plotHint: string
      category: string
      product?: string
      amount: number
      dateHint: string
    }
  | {
      kind: 'activity'
      plotHint: string
      type: string
      product?: string
      qty?: number
      amount?: number
      dateHint: string
    }
  | { kind: 'question'; topic: string }

const PLOT = /plot\s*0?(\d+)/i
const INR = /(?:₹|rs\.?|rupees?)\s*([\d,]+)|([\d,]+)\s*(?:₹|rs\.?|rupees?)/i

export function interpret(text: string): ProposedRecord | { kind: 'unknown'; reason: string } {
  const t = text.trim()
  const plot = t.match(PLOT)
  const plotHint = plot ? `Plot ${plot[1].padStart(2, '0')}` : ''
  const money = t.match(INR)
  const amount = money ? Number((money[1] ?? money[2]).replace(/,/g, '')) : undefined
  const today = /today/i.test(t) ? 'today' : /yesterday/i.test(t) ? 'yesterday' : 'unspecified'

  if (/how much|what did|show |which plot|left\??|compare /i.test(t)) {
    return { kind: 'question', topic: t }
  }

  if (/npk|urea|dap|fertilizer/i.test(t) && amount != null && plotHint) {
    return {
      kind: 'activity',
      plotHint,
      type: 'Fertilizing',
      product: /urea/i.test(t) ? 'Urea' : /dap/i.test(t) ? 'DAP' : 'NPK 20-20-20',
      qty: Number(t.match(/(\d+(?:\.\d+)?)\s*kg/i)?.[1]) || undefined,
      amount,
      dateHint: today,
    }
  }

  if (amount != null && plotHint && /spent|paid|expense|cost/i.test(t)) {
    const category = /labour|labor|worker/i.test(t)
      ? 'labour'
      : /fertilizer|npk|urea/i.test(t)
        ? 'fertilizer'
        : 'other'
    return {
      kind: 'expense',
      plotHint,
      category,
      product: /npk/i.test(t) ? 'NPK' : undefined,
      amount,
      dateHint: today,
    }
  }

  return { kind: 'unknown', reason: 'Could not parse a farm record from that sentence. Try naming a plot and an amount.' }
}

export function resolveDate(hint: string, now = new Date()) {
  if (hint === 'today') return now
  if (hint === 'yesterday') {
    const d = new Date(now)
    d.setDate(d.getDate() - 1)
    return d
  }
  return now
}
