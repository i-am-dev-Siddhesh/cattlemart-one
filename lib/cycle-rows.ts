import { format } from 'date-fns'

export function isoDay(d: Date) {
  return format(d, 'd MMM yyyy')
}

export function activityLines(rows: { id: string; date: Date; type: string; description: string | null; totalCost: number }[]) {
  return rows.map((a) => ({
    id: a.id,
    date: isoDay(a.date),
    label: a.description ? `${a.type} · ${a.description}` : a.type,
    amount: a.totalCost,
  }))
}

export function expenseLines(rows: { id: string; date: Date; category: string; amount: number }[]) {
  return rows.map((e) => ({
    id: e.id,
    date: isoDay(e.date),
    label: e.category,
    amount: e.amount,
  }))
}

export function saleLines(rows: { id: string; date: Date; net: number; paymentStatus: string }[]) {
  return rows.map((s) => ({
    id: s.id,
    date: isoDay(s.date),
    label: s.paymentStatus,
    amount: s.net,
  }))
}

export function labourLines(rows: { id: string; date: Date; workers: number; cost: number }[]) {
  return rows.map((l) => ({
    id: l.id,
    date: isoDay(l.date),
    label: `${l.workers} workers`,
    amount: l.cost,
  }))
}

export function harvestLines(rows: { id: string; date: Date; quantity: number; unit: string }[]) {
  return rows.map((h) => ({
    id: h.id,
    date: isoDay(h.date),
    label: `${h.quantity} ${h.unit}`,
    extra: `${h.quantity} ${h.unit}`,
  }))
}

export function irrigationLines(rows: { id: string; date: Date; method: string | null; quantityL: number | null }[]) {
  return rows.map((i) => ({
    id: i.id,
    date: isoDay(i.date),
    label: i.method ?? 'Irrigation',
    extra: i.quantityL != null ? `${i.quantityL} L` : '—',
  }))
}
