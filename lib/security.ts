const WEAK_SECRETS = new Set([
  '',
  'replace-me',
  'changeme',
  'secret',
  'password',
  'farmos-dev-secret-change-in-production',
])

const COMMON_PASSWORDS = new Set([
  'farmos-demo',
  'password',
  'password1',
  'password123',
  '12345678',
  '123456789',
  'qwerty123',
  'letmein1',
])

const loginHits = new Map<string, { count: number; resetAt: number }>()

export function assertAuthSecret() {
  const secret = process.env.AUTH_SECRET?.trim() ?? ''
  const weak = WEAK_SECRETS.has(secret) || secret.length < 32
  if (process.env.NODE_ENV === 'production' && weak) {
    throw new Error('AUTH_SECRET must be a unique value at least 32 characters long.')
  }
}

export function trustAuthHost() {
  return process.env.NODE_ENV !== 'production' || process.env.AUTH_TRUST_HOST === 'true'
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

export function assertLoginAllowed(email: string) {
  const key = normalizeEmail(email) || 'unknown'
  const now = Date.now()
  const row = loginHits.get(key)
  if (!row || row.resetAt < now) {
    loginHits.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 })
    return
  }
  row.count += 1
  if (row.count > 8) {
    throw new Error('Too many sign-in tries. Wait a few minutes and try again.')
  }
}

export function clearLoginHits(email: string) {
  loginHits.delete(normalizeEmail(email))
}

export function assertPasswordStrength(password: string) {
  if (password.length < 10) throw new Error('New password needs at least 10 characters.')
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    throw new Error('Choose a password that is not a common or demo password.')
  }
}

export function assertMoney(amount: number, label = 'Amount') {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) {
    throw new Error(`${label} must be a positive number.`)
  }
}

export function assertOptionalMoney(amount: number | undefined, label = 'Amount') {
  if (amount == null) return
  assertMoney(amount, label)
}

export function assertQuantity(quantity: number, label = 'Quantity') {
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1_000_000_000) {
    throw new Error(`${label} must be a positive number.`)
  }
}

export function csvCell(value: string | number | null | undefined) {
  let text = value == null ? '' : String(value)
  if (/^[=+\-@|]/.test(text)) text = `'${text}`
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function csvRow(cells: Array<string | number | null | undefined>) {
  return cells.map(csvCell).join(',')
}

export function canWriteRole(role: string) {
  return role === 'owner' || role === 'manager'
}

export function cookieSecure() {
  return process.env.NODE_ENV === 'production'
}
