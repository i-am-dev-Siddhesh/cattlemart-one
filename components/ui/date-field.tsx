'use client'

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { addMonths, format, getDay, isSameDay, isSameMonth, isToday, startOfMonth } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function parseISODate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return Number.isNaN(date.getTime()) ? null : date
}

function toISODate(date: Date) {
  return format(date, 'yyyy-MM-dd')
}

function monthCells(cursor: Date) {
  const start = startOfMonth(cursor)
  const offset = (getDay(start) + 6) % 7
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(start.getFullYear(), start.getMonth(), 1 - offset + i))
  }
  return cells
}

type InputProps = React.ComponentProps<'input'>

export function DateField({
  className,
  name,
  id,
  value,
  defaultValue,
  onChange,
  onBlur,
  required,
  disabled,
  min,
  max,
  placeholder = 'Select date',
  ...props
}: InputProps) {
  const reactId = useId()
  const fieldId = id ?? reactId
  const hiddenRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const controlled = value !== undefined
  const [open, setOpen] = useState(false)
  const [inner, setInner] = useState(() => String(defaultValue ?? value ?? ''))
  const selectedISO = controlled ? String(value ?? '') : inner
  const selected = parseISODate(selectedISO)
  const [cursor, setCursor] = useState(() => selected ?? new Date())
  const [pos, setPos] = useState({ top: 0, left: 0, width: 280 })

  useEffect(() => {
    if (controlled) return
    setInner(String(defaultValue ?? ''))
  }, [controlled, defaultValue])

  useEffect(() => {
    if (open) setCursor(selected ?? new Date())
  }, [open, selectedISO])

  function place() {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const width = Math.min(320, Math.max(280, r.width))
    const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8)
    const below = r.bottom + 8
    const height = 360
    const top = below + height > window.innerHeight - 8 ? Math.max(8, r.top - height - 8) : below
    setPos({ top, left, width })
  }

  useLayoutEffect(() => {
    if (!open) return
    place()
    const onMove = () => place()
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    function onPointer(e: MouseEvent) {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || popRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
    }
  }, [open])

  const days = useMemo(() => monthCells(cursor), [cursor])

  function commit(next: string) {
    if (!controlled) setInner(next)
    const target = hiddenRef.current
    if (target) {
      target.value = next
      onChange?.({
        ...({} as React.ChangeEvent<HTMLInputElement>),
        target,
        currentTarget: target,
      })
    }
    setOpen(false)
  }

  const minDate = parseISODate(typeof min === 'string' ? min : undefined)
  const maxDate = parseISODate(typeof max === 'string' ? max : undefined)

  return (
    <div className={cn('date-field', className)}>
      <input
        {...props}
        ref={hiddenRef}
        id={fieldId}
        name={name}
        type="text"
        inputMode="none"
        required={required}
        disabled={disabled}
        value={selectedISO}
        onChange={() => undefined}
        onBlur={onBlur}
        className="sr-only"
        tabIndex={-1}
        autoComplete="off"
      />
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`${fieldId}-cal`}
        className={cn('control date-control', !selected && 'date-control-empty')}
        onClick={() => setOpen((v) => !v)}
      >
        <CalendarDays className="date-control-icon" aria-hidden />
        <span className="date-control-value">{selected ? format(selected, 'd MMM yyyy') : placeholder}</span>
        {selected ? <span className="date-control-chip">{format(selected, 'EEE')}</span> : null}
      </button>
      {open
        ? createPortal(
            <div
              ref={popRef}
              id={`${fieldId}-cal`}
              role="dialog"
              aria-label="Choose date"
              className="date-pop"
              style={{ top: pos.top, left: pos.left, width: pos.width }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="date-pop-head">
                <button type="button" className="date-nav" onClick={() => setCursor((d) => addMonths(d, -1))} aria-label="Previous month">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="date-pop-title">{format(cursor, 'MMMM yyyy')}</p>
                <button type="button" className="date-nav" onClick={() => setCursor((d) => addMonths(d, 1))} aria-label="Next month">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="date-week">
                {WEEKDAYS.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="date-grid">
                {days.map((day) => {
                  const iso = toISODate(day)
                  const outside = !isSameMonth(day, cursor)
                  const on = selected ? isSameDay(day, selected) : false
                  const today = isToday(day)
                  const tooEarly = minDate ? day < minDate : false
                  const tooLate = maxDate ? day > maxDate : false
                  const blocked = tooEarly || tooLate
                  return (
                    <button
                      key={iso + String(outside)}
                      type="button"
                      disabled={blocked}
                      onClick={() => commit(iso)}
                      className={cn(
                        'date-day',
                        outside && 'date-day-mute',
                        today && 'date-day-today',
                        on && 'date-day-on',
                      )}
                    >
                      {day.getDate()}
                    </button>
                  )
                })}
              </div>
              <div className="date-pop-foot">
                <button type="button" className="date-link" onClick={() => commit(toISODate(new Date()))}>
                  Today
                </button>
                {!required ? (
                  <button type="button" className="date-link" onClick={() => commit('')}>
                    Clear
                  </button>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
