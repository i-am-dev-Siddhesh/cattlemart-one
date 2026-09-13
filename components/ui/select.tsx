'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type Opt = { value: string; label: string; disabled?: boolean }

function textOf(node: React.ReactNode) {
  return React.Children.toArray(node)
    .filter((c) => typeof c === 'string' || typeof c === 'number')
    .join('')
}

function readOptions(node: React.ReactNode, out: Opt[] = []) {
  React.Children.forEach(node, (child) => {
    if (!React.isValidElement(child)) return
    if (child.type === 'option') {
      const props = (child as React.ReactElement<React.ComponentProps<'option'>>).props
      const label = textOf(props.children)
      out.push({
        value: props.value !== undefined ? String(props.value) : label,
        label,
        disabled: props.disabled,
      })
      return
    }
    const props = (child as React.ReactElement<{ children?: React.ReactNode }>).props
    if (props?.children) readOptions(props.children, out)
  })
  return out
}

export function Select({
  className,
  children,
  name,
  id,
  value,
  defaultValue,
  onChange,
  required,
  disabled,
  autoFocus,
  form,
  title,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}: React.ComponentProps<'select'>) {
  const reactId = React.useId()
  const fieldId = id ?? reactId
  const hiddenRef = React.useRef<HTMLInputElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const popRef = React.useRef<HTMLDivElement>(null)
  const controlled = value !== undefined
  const options = React.useMemo(() => readOptions(children), [children])
  const [inner, setInner] = React.useState(() => (defaultValue !== undefined ? String(defaultValue) : ''))
  const raw = controlled ? String(value ?? '') : inner
  // A value with no matching option falls back to the first one, like a native select.
  const selected = options.find((o) => o.value === raw) ?? options.find((o) => !o.disabled) ?? options[0]
  const current = selected?.value ?? ''
  const [open, setOpen] = React.useState(false)
  const [active, setActive] = React.useState(0)
  const [pos, setPos] = React.useState({ top: 0, left: 0, width: 200 })

  function place() {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const width = Math.max(r.width, 180)
    const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8)
    const height = popRef.current?.offsetHeight ?? Math.min(292, options.length * 38 + 12)
    const below = r.bottom + 6
    const top = below + height > window.innerHeight - 8 ? Math.max(8, r.top - height - 6) : below
    setPos({ top, left, width })
  }

  React.useLayoutEffect(() => {
    if (!open) return
    place()
    const frame = requestAnimationFrame(place)
    const onMove = () => place()
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
  }, [open, options.length])

  React.useEffect(() => {
    if (!open) return
    function onPointer(e: MouseEvent) {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || popRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [open])

  React.useEffect(() => {
    if (!open) return
    popRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  function commit(next: string) {
    if (!controlled) setInner(next)
    const target = hiddenRef.current
    if (target) {
      target.value = next
      onChange?.({
        ...({} as React.ChangeEvent<HTMLSelectElement>),
        target: target as unknown as HTMLSelectElement,
        currentTarget: target as unknown as HTMLSelectElement,
      })
    }
    setOpen(false)
    triggerRef.current?.focus()
  }

  function step(from: number, dir: number) {
    let i = from
    for (let n = 0; n < options.length; n++) {
      i = (i + dir + options.length) % options.length
      if (!options[i]?.disabled) return i
    }
    return from
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const index = Math.max(0, options.findIndex((o) => o.value === current))
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setActive(index)
        setOpen(true)
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => step(i, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => step(i, -1))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActive(step(options.length - 1, 1))
    } else if (e.key === 'End') {
      e.preventDefault()
      setActive(step(0, -1))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const opt = options[active]
      if (opt && !opt.disabled) commit(opt.value)
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div className={cn('select-field', className?.includes('w-auto') && 'w-auto')}>
      <input
        ref={hiddenRef}
        id={fieldId}
        name={name}
        type="text"
        inputMode="none"
        required={required}
        disabled={disabled}
        value={current}
        onChange={() => undefined}
        className="sr-only"
        tabIndex={-1}
        autoComplete="off"
      />
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        autoFocus={autoFocus}
        form={form}
        title={title}
        role="combobox"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${fieldId}-list`}
        className={cn('control select-control', !selected && 'select-control-empty', className)}
        onClick={() => {
          setActive(Math.max(0, options.findIndex((o) => o.value === current)))
          setOpen((v) => !v)
        }}
        onKeyDown={onKeyDown}
      >
        <span className="select-control-value">{selected?.label ?? ''}</span>
        <ChevronDown className={cn('select-caret', open && 'select-caret-open')} aria-hidden />
      </button>
      {open
        ? createPortal(
            <div
              ref={popRef}
              id={`${fieldId}-list`}
              role="listbox"
              className="select-panel"
              style={{ top: pos.top, left: pos.left, width: pos.width }}
              onMouseDown={(e) => e.preventDefault()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {options.map((opt, i) => (
                <button
                  key={`${opt.value}-${i}`}
                  type="button"
                  role="option"
                  aria-selected={opt.value === current}
                  data-active={i === active}
                  disabled={opt.disabled}
                  className={cn('select-option', i === active && 'select-option-active', opt.value === current && 'select-option-on')}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => commit(opt.value)}
                >
                  <span className="select-option-label">{opt.label}</span>
                  {opt.value === current ? <Check className="select-check" aria-hidden /> : null}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
