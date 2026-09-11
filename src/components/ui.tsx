import { type FormEvent, type ReactNode, useEffect, useState } from 'react'

export function Button({
  children,
  onClick,
  kind = 'primary',
  type = 'button',
  small,
}: {
  children: ReactNode
  onClick?: () => void
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger'
  type?: 'button' | 'submit'
  small?: boolean
}) {
  return (
    <button type={type} className={`btn ${kind} ${small ? 'small' : ''}`} onClick={onClick}>
      {children}
    </button>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="modal-back" onClick={onClose} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="row">
          <h3>{title}</h3>
          <span className="spacer" />
          <Button kind="secondary" small onClick={onClose}>
            Close
          </Button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'good' | 'bad'
}) {
  return (
    <div className={`stat ${tone || ''}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  )
}

export function Empty({ text }: { text: string }) {
  return <p className="lede">{text}</p>
}

export function Money({ n }: { n: number }) {
  const cls = n >= 0 ? 'profit' : 'loss'
  return (
    <span className={cls}>
      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)}
    </span>
  )
}

export function useForm<T extends Record<string, string>>(initial: T) {
  const [values, setValues] = useState(initial)
  const [error, setError] = useState('')
  const set = (k: keyof T, v: string) => setValues((s) => ({ ...s, [k]: v }))
  const onSubmit = (fn: (v: T) => void) => (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      fn(values)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }
  return { values, set, error, setError, onSubmit, setValues }
}
