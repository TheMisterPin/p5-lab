'use client'

import { useEffect, useId, useRef, useState } from 'react'

export const inputClass = 'h-8 min-w-0 w-full rounded border bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive disabled:opacity-40'
export type Transaction = { end: () => void; cancel: () => void }
export function NumberField({ label, value, min, max, disabled, validate, onChange, end, cancel }: {
  label: string; value: number; min?: number; max?: number; disabled?: boolean; validate?: (value: number) => boolean; onChange: (value: number) => void
} & Transaction) {
  const [draft, setDraft] = useState(String(Number(value.toFixed(3))))
  const [invalid, setInvalid] = useState(false)
  const editing = useRef(false)
  const id = useId()
  useEffect(() => { if (!editing.current) setDraft(String(Number(value.toFixed(3)))) }, [value])
  return <label className="editor-field">{label}<input aria-label={label} type="number" step="any" min={min} max={max} disabled={disabled} value={draft} aria-invalid={invalid} aria-describedby={invalid ? id : undefined} className={inputClass}
    onFocus={() => { editing.current = true }} onChange={e => {
      const text = e.target.value, n = Number(text)
      setDraft(text)
      const bad = !text.trim() || !Number.isFinite(n) || (min !== undefined && n < min) || (max !== undefined && n > max) || (validate !== undefined && !validate(n))
      setInvalid(bad); if (!bad) onChange(n)
    }} onBlur={() => { editing.current = false; if (invalid) cancel(); else end() }} onKeyDown={e => {
      if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() }
      if (e.key === 'Escape') { e.stopPropagation(); editing.current = false; cancel(); setDraft(String(Number(value.toFixed(3)))); setInvalid(false); e.currentTarget.blur() }
    }} />{invalid && <span id={id} role="alert" className="text-destructive">Invalid value</span>}</label>
}
export function ColorField({ label, value, onChange, end }: { label: string; value: string; onChange: (color: string) => void; end: () => void }) {
  const input = useRef<HTMLInputElement>(null), finish = useRef(end)
  useEffect(() => { finish.current = end }, [end])
  useEffect(() => {
    const field = input.current
    const done = () => queueMicrotask(() => finish.current())
    field?.addEventListener('change', done)
    return () => field?.removeEventListener('change', done)
  }, [])
  return <label className="editor-field">{label}<input ref={input} aria-label={label} type="color" value={value} className="h-8 w-full cursor-pointer rounded border bg-background p-1" onChange={e => onChange(e.target.value)} onBlur={end} /></label>
}
