import { currentCycle, farmTotals, summarizePlot } from './finance'
import type { AppState, ExpenseCategory, Plot } from './types'
import { formatArea, formatDate, formatMoney, todayIso } from './units'

export type FarmOSIntent =
  | { kind: 'ask'; topic: string }
  | { kind: 'expense'; plotId?: string; amount?: number; category?: ExpenseCategory; notes: string; date: string }
  | { kind: 'diary'; text: string; plotId?: string; date: string }
  | { kind: 'task'; title: string; plotId?: string; dueDate: string }
  | { kind: 'pest'; plotId?: string; name: string; date: string }
  | { kind: 'disease'; plotId?: string; name: string; date: string }
  | { kind: 'irrigation'; plotId?: string; date: string; hours?: number }
  | { kind: 'harvest'; plotId?: string; qty?: number; date: string }
  | { kind: 'unknown' }

export type FarmOSReply = {
  text: string
  intent: FarmOSIntent
  needsConfirm: boolean
  missing: string[]
}

export function matchPlot(state: AppState, text: string): Plot | undefined {
  const q = text.toLowerCase()
  return state.plots.find((p) => {
    const n = p.name.toLowerCase()
    const num = p.plotNumber.toLowerCase()
    return (
      q.includes(n) ||
      q.includes(num) ||
      q.includes(num.replace('-', '')) ||
      q.includes(`plot ${p.plotNumber.slice(-1).toLowerCase()}`) ||
      (n.startsWith('plot ') && q.includes(n.replace('plot ', 'plot')))
    )
  })
}

function rupees(text: string): number | undefined {
  const m = text.replace(/,/g, '').match(/(?:₹|rs\.?|inr)\s*([\d.]+)|([\d.]+)\s*(?:rupees|rs)/i)
  if (m) return Number(m[1] || m[2])
  const bare = text.match(/spent\s+([\d.]+)/i)
  if (bare) return Number(bare[1])
  return undefined
}

function categoryOf(text: string): ExpenseCategory | undefined {
  const t = text.toLowerCase()
  if (/urea|dap|npk|fertil|manure|compost|vermi/.test(t)) return 'fertilizers'
  if (/seed|seedling/.test(t)) return 'seeds'
  if (/herbicide|weedicide/.test(t)) return 'herbicides'
  if (/fungicide/.test(t)) return 'fungicides'
  if (/pesticid|insecticid|spray/.test(t)) return 'pesticides'
  if (/diesel|petrol|fuel/.test(t)) return 'fuel'
  if (/electric|light bill/.test(t)) return 'electricity'
  if (/labour|mazdoor|wages/.test(t)) return 'labour'
  if (/tractor|rotavator|machine/.test(t)) return 'machinery'
  if (/irrigat|pump|drip/.test(t)) return 'irrigation'
  if (/harvest/.test(t)) return 'harvesting'
  if (/lease|rent/.test(t)) return 'lease'
  return undefined
}

export function interpret(text: string, state: AppState): FarmOSReply {
  const raw = text.trim()
  const lower = raw.toLowerCase()
  const plot = matchPlot(state, lower)
  const date = todayIso()
  const farm = state.farms.find((f) => f.id === state.activeFarmId) ?? state.farms[0]

  if (/how many (acres|plots)|total area|show all (my )?plots|under cultivation/.test(lower)) {
    return askOverview(state, farm?.id)
  }
  if (/how much.*(spend|spent|expense)|fertilizer expense|labour cost|this month|this season/.test(lower)) {
    return askMoney(state, farm?.id, lower)
  }
  if (/most (money|profit)|highest profit|best roi|which plot is/.test(lower)) {
    return askCompare(state, farm?.id)
  }
  if (/growing|what (is |was )?grown|planted|last year|history|disease/.test(lower) && (plot || /plot/.test(lower))) {
    return askPlot(state, plot, lower)
  }
  if (/urea|stock|inventory|running low/.test(lower) && /how much|have|low/.test(lower)) {
    return askStock(state, farm?.id)
  }
  if (/pending|today|irrigation|task/.test(lower) && /what|which|need|due/.test(lower)) {
    return askOps(state, farm?.id)
  }
  if (/compare.*(season|rice|2024|2025|2026)/.test(lower)) {
    return askSeason(state, farm?.id)
  }

  if (/spent|expense|paid|bill/.test(lower) && rupees(lower)) {
    const amount = rupees(lower)!
    const category = categoryOf(lower)
    const missing: string[] = []
    if (!plot) missing.push('which plot')
    if (!category) missing.push('expense category (or what was bought)')
    const intent: FarmOSIntent = {
      kind: 'expense',
      plotId: plot?.id,
      amount,
      category,
      notes: raw,
      date,
    }
    if (missing.length) {
      return { text: `I can book ₹${amount}, but I still need: ${missing.join(', ')}.`, intent, needsConfirm: false, missing }
    }
    return {
      text: `I understood this as:\n\nPlot: ${plot!.name}\nCategory: ${category}\nAmount: ${formatMoney(amount)}\nDate: ${formatDate(date)}\nCrop cycle: ${currentCycle(state.cropCycles, plot!.id)?.cropName || 'not inferred'}\n\nSave this expense? Money records wait for your yes.`,
      intent,
      needsConfirm: true,
      missing: [],
    }
  }

  if (/spray|pest|bollworm|insect/.test(lower) && !/spent|₹|rs/.test(lower)) {
    if (!plot) {
      return {
        text: 'Which plot, and which pest or product? I will not prescribe a chemical from this sentence.',
        intent: { kind: 'pest', name: raw, date },
        needsConfirm: false,
        missing: ['plot', 'pest or product'],
      }
    }
    return {
      text: `Possible pest note on ${plot.name}. This is not a confirmed diagnosis. Save as a scouting record?`,
      intent: { kind: 'pest', plotId: plot.id, name: raw, date },
      needsConfirm: true,
      missing: [],
    }
  }

  if (/disease|blast|blight|rot|leaf spot/.test(lower)) {
    if (!plot) {
      return {
        text: 'Which plot showed disease, and what did you see? Image or name alone is not a confirmed diagnosis.',
        intent: { kind: 'disease', name: raw, date },
        needsConfirm: false,
        missing: ['plot'],
      }
    }
    return {
      text: `Possible disease note on ${plot.name} (confidence: possible). Save to plot history?`,
      intent: { kind: 'disease', plotId: plot.id, name: raw, date },
      needsConfirm: true,
      missing: [],
    }
  }

  if (/irrigat|pumped|drip/.test(lower)) {
    const hours = Number(lower.match(/(\d+(\.\d+)?)\s*(hour|hr)/)?.[1])
    if (!plot) {
      return { text: 'Which plot did you irrigate?', intent: { kind: 'irrigation', date, hours }, needsConfirm: false, missing: ['plot'] }
    }
    return {
      text: `Irrigation on ${plot.name}${hours ? `, ${hours} hours` : ''}. Volume in litres is not recorded unless you give it. Save?`,
      intent: { kind: 'irrigation', plotId: plot.id, date, hours: Number.isFinite(hours) ? hours : undefined },
      needsConfirm: true,
      missing: [],
    }
  }

  if (/harvest|quintal|yield/.test(lower) && /\d/.test(lower)) {
    const qty = Number(lower.match(/(\d+(\.\d+)?)/)?.[1])
    if (!plot) {
      return { text: 'Which plot did you harvest, and what unit (kg / quintal / ton)?', intent: { kind: 'harvest', qty, date }, needsConfirm: false, missing: ['plot'] }
    }
    return {
      text: `Harvest ${qty} (unit not sure — I will store quintal only if you confirm) on ${plot.name}. Save?`,
      intent: { kind: 'harvest', plotId: plot.id, qty, date },
      needsConfirm: true,
      missing: [],
    }
  }

  if (/remind|task|need to|tomorrow/.test(lower)) {
    return {
      text: `Task: “${raw}”${plot ? ` on ${plot.name}` : ''}. Save to the farm calendar?`,
      intent: { kind: 'task', title: raw, plotId: plot?.id, dueDate: date },
      needsConfirm: true,
      missing: [],
    }
  }

  if (raw.length > 12) {
    return {
      text: `Farm diary note${plot ? ` for ${plot.name}` : ''}. I will not invent a plot if you did not name one. Save the wording as written?`,
      intent: { kind: 'diary', text: raw, plotId: plot?.id, date },
      needsConfirm: true,
      missing: [],
    }
  }

  return {
    text: 'Ask about acres, plots, spend, a named plot’s history, stock, or tasks — or say what you spent / observed. I only use this farm’s book. I do not invent GPS, soil numbers, doses, or mandi prices.',
    intent: { kind: 'unknown' },
    needsConfirm: false,
    missing: [],
  }
}

function askOverview(state: AppState, farmId?: string): FarmOSReply {
  if (!farmId) return none()
  const plots = state.plots.filter((p) => p.farmId === farmId)
  const acres = plots.reduce((s, p) => s + (p.areaUnit === 'acre' ? p.area : 0), 0)
  const active = plots.filter((p) => p.status === 'active')
  const lines = plots.map((p) => {
    const c = currentCycle(state.cropCycles, p.id)
    return `${p.plotNumber} ${p.name} — ${formatArea(p.area, p.areaUnit)} — ${c ? `${c.cropName} (${c.season})` : 'no current cycle'}`
  })
  return {
    text: `Recorded cultivated area from plot books: ${acres} acre (only plots already in acres). Plots: ${plots.length}. Active: ${active.length}.\n\n${lines.join('\n')}`,
    intent: { kind: 'ask', topic: 'overview' },
    needsConfirm: false,
    missing: [],
  }
}

function askMoney(state: AppState, farmId?: string, q = ''): FarmOSReply {
  if (!farmId) return none()
  const t = farmTotals(state, farmId)
  const month = todayIso().slice(0, 7)
  const plots = new Set(state.plots.filter((p) => p.farmId === farmId).map((p) => p.id))
  const monthExp = state.expenses.filter((e) => plots.has(e.plotId) && e.date.startsWith(month))
  const fert = state.expenses.filter((e) => plots.has(e.plotId) && e.category === 'fertilizers')
  const labour = state.expenses.filter((e) => plots.has(e.plotId) && e.category === 'labour')
  let extra = ''
  if (/month/.test(q)) extra = `\nThis calendar month (${month}): ${formatMoney(monthExp.reduce((s, e) => s + e.amount, 0))} from dated expenses.`
  if (/fertil/.test(q)) extra += `\nFertilizer category in the book: ${formatMoney(fert.reduce((s, e) => s + e.amount, 0))}.`
  if (/labour/.test(q)) extra += `\nLabour category: ${formatMoney(labour.reduce((s, e) => s + e.amount, 0))}.`
  return {
    text: `Farm totals from plot transactions (not estimates):\nExpense ${formatMoney(t.expense)}\nRevenue ${formatMoney(t.income)}\nProfit ${formatMoney(t.profit)}${extra}`,
    intent: { kind: 'ask', topic: 'money' },
    needsConfirm: false,
    missing: [],
  }
}

function askCompare(state: AppState, farmId?: string): FarmOSReply {
  if (!farmId) return none()
  const t = farmTotals(state, farmId)
  const best = [...t.rows].sort((a, b) => b.profit - a.profit)[0]
  if (!best) return { text: 'No plot books yet.', intent: { kind: 'ask', topic: 'compare' }, needsConfirm: false, missing: [] }
  return {
    text: `Highest profit in the book: ${best.plot.name} — ${formatMoney(best.profit)} (${formatMoney(best.profitPerAcre)} / acre). This uses recorded sales minus recorded expenses, including older cycles on that plot unless you filter.`,
    intent: { kind: 'ask', topic: 'compare' },
    needsConfirm: false,
    missing: [],
  }
}

function askPlot(state: AppState, plot: Plot | undefined, q: string): FarmOSReply {
  if (!plot) {
    return { text: 'Name the plot (for example Plot A or P-001).', intent: { kind: 'ask', topic: 'plot' }, needsConfirm: false, missing: ['plot'] }
  }
  const cycles = state.cropCycles.filter((c) => c.plotId === plot.id).sort((a, b) => a.plantingDate.localeCompare(b.plantingDate))
  const lastYear = cycles.filter((c) => c.plantingDate.startsWith('2025'))
  const diseases = state.diseases.filter((d) => d.plotId === plot.id)
  const fin = summarizePlot(state, plot)
  const hist = cycles.map((c) => `${c.season}: ${c.cropName} ${c.variety} — yield ${c.actualYield ?? 'not recorded'} ${c.yieldUnit}`).join('\n')
  let extra = ''
  if (/last year|2025/.test(q)) extra = lastYear.length ? `\n2025 in the book:\n${lastYear.map((c) => `${c.cropName} ${c.season}`).join(', ')}` : '\nNo 2025 cycle on this plot in the book.'
  if (/disease/.test(q)) extra += diseases.length ? `\nDisease notes: ${diseases.map((d) => `${d.date} ${d.name} (${d.confidence})`).join('; ')}` : '\nNo disease rows on this plot.'
  return {
    text: `${plot.plotNumber} ${plot.name} — ${formatArea(plot.area, plot.areaUnit)}\nNow: ${currentCycle(state.cropCycles, plot.id)?.cropName || 'none'}\nBook profit (all recorded cycles): ${formatMoney(fin.profit)}\n\nHistory (kept, not overwritten):\n${hist || 'None'}${extra}`,
    intent: { kind: 'ask', topic: 'plot' },
    needsConfirm: false,
    missing: [],
  }
}

function askStock(state: AppState, farmId?: string): FarmOSReply {
  const items = state.inventory.filter((i) => i.farmId === farmId)
  if (!items.length) return { text: 'No inventory rows yet.', intent: { kind: 'ask', topic: 'stock' }, needsConfirm: false, missing: [] }
  const urea = items.find((i) => /urea/i.test(i.name))
  const low = items.filter((i) => i.quantity <= i.minStock)
  const lines = items.map((i) => `${i.name}: ${i.quantity} ${i.unit} (min ${i.minStock})`)
  return {
    text: `${lines.join('\n')}${urea ? `\nUrea on hand: ${urea.quantity} ${urea.unit}.` : ''}${low.length ? `\nAt or below min: ${low.map((i) => i.name).join(', ')}.` : ''}`,
    intent: { kind: 'ask', topic: 'stock' },
    needsConfirm: false,
    missing: [],
  }
}

function askOps(state: AppState, farmId?: string): FarmOSReply {
  const today = todayIso()
  const tasks = state.tasks.filter((t) => t.farmId === farmId && t.status !== 'completed' && t.status !== 'cancelled')
  const irrig = state.irrigations.filter((i) => i.date >= today)
  return {
    text: `Open tasks:\n${tasks.map((t) => `${t.dueDate} — ${t.title} (${t.status})`).join('\n') || 'None'}\n\nIrrigation rows dated today or later: ${irrig.length ? irrig.map((i) => i.date).join(', ') : 'none recorded'}.`,
    intent: { kind: 'ask', topic: 'ops' },
    needsConfirm: false,
    missing: [],
  }
}

function askSeason(state: AppState, farmId?: string): FarmOSReply {
  const plots = new Set(state.plots.filter((p) => p.farmId === farmId).map((p) => p.id))
  const rice = state.cropCycles.filter((c) => plots.has(c.plotId) && /paddy|rice/i.test(c.cropName))
  if (!rice.length) return { text: 'No rice/paddy cycles in the book to compare.', intent: { kind: 'ask', topic: 'season' }, needsConfirm: false, missing: [] }
  const lines = rice.map((c) => {
    const plot = state.plots.find((p) => p.id === c.plotId)
    const fin = plot ? summarizePlot(state, plot, undefined, c.id) : null
    return `${c.season} ${plot?.name} yield ${c.actualYield ?? 'not recorded'} ${c.yieldUnit}; cycle expense ${fin ? formatMoney(fin.expense) : 'n/a'}`
  })
  return {
    text: `Rice/paddy cycles on file:\n${lines.join('\n')}\nYields and rupees are only what was entered.`,
    intent: { kind: 'ask', topic: 'season' },
    needsConfirm: false,
    missing: [],
  }
}

function none(): FarmOSReply {
  return { text: 'I don\'t have a farm in context yet.', intent: { kind: 'ask', topic: 'none' }, needsConfirm: false, missing: [] }
}

export function buildAlerts(state: AppState) {
  const farmId = state.activeFarmId
  const alerts: { tone: 'warn' | 'info'; text: string }[] = []
  if (!farmId) return alerts
  const today = todayIso()
  for (const t of state.tasks.filter((x) => x.farmId === farmId && x.status !== 'completed' && x.dueDate <= today)) {
    alerts.push({ tone: 'warn', text: `Due: ${t.title} (${t.dueDate})` })
  }
  for (const i of state.inventory.filter((x) => x.farmId === farmId && x.quantity <= x.minStock)) {
    alerts.push({ tone: 'warn', text: `Low stock: ${i.name} ${i.quantity} ${i.unit}` })
  }
  for (const d of state.diseases.filter((x) => state.plots.some((p) => p.id === x.plotId && p.farmId === farmId))) {
    const p = state.plots.find((pl) => pl.id === d.plotId)
    alerts.push({ tone: 'info', text: `Disease history ${p?.name}: ${d.name} (${d.confidence})` })
  }
  return alerts.slice(0, 8)
}

export const CROP_NOTES = [
  {
    name: 'Paddy',
    local: 'भात / நெல்',
    scientific: 'Oryza sativa',
    seasons: 'Kharif in this district (not a prescription)',
    note: 'Duration, seed rate and doses depend on variety, soil test and local advice. Not stored as guaranteed practice.',
  },
  {
    name: 'Wheat',
    local: 'गहू',
    scientific: 'Triticum aestivum',
    seasons: 'Rabi',
    note: 'Expected yield ranges are not filled unless you record them.',
  },
  {
    name: 'Cotton',
    local: 'कापूस',
    scientific: 'Gossypium spp.',
    seasons: 'Kharif',
    note: 'Pest thresholds need local scouting. No automatic spray from a name.',
  },
  {
    name: 'Onion',
    local: 'कांदा',
    scientific: 'Allium cepa',
    seasons: 'Rabi / late kharif in Nashik belt',
    note: 'Market and MSP figures are not invented in this book.',
  },
]
