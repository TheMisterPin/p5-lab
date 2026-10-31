'use client'

import { useEffect, useId, useRef } from 'react'
import { FolderOpen, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SketchMeta } from '@/lib/sketches/types'

type SketchPickerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sketches: SketchMeta[]
  activeId: string
  onSelect: (id: string) => void
  onCreate: () => void
  onRename: (id: string) => void
  onDelete: (id: string) => void
}

function formatUpdatedAt(timestamp: number) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(timestamp))
  } catch {
    return ''
  }
}

export function ChangeSketchButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="outline" onClick={onClick}>
      <FolderOpen data-icon="inline-start" />
      Change sketch
    </Button>
  )
}

export function SketchPicker({
  open,
  onOpenChange,
  sketches,
  activeId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: SketchPickerProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false)
      if (event.key === 'Tab') {
        const buttons = panelRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
        if (!buttons?.length) return
        const first = buttons[0], last = buttons[buttons.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    panelRef.current?.querySelector<HTMLElement>('button[role="option"]')?.focus()
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKeyDown)
      previousFocus?.focus()
    }
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onOpenChange(false)
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex w-full max-w-md flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-lg"
      >
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <h2 id={titleId} className="text-sm font-medium">Change sketch</h2>
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
        <ul className="max-h-80 overflow-auto p-2" role="listbox" aria-label="Saved sketches">
          {sketches.map(sketch => {
            const selected = sketch.id === activeId
            return (
              <li key={sketch.id} className="flex items-center gap-1 rounded-lg p-1">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`min-w-0 flex-1 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring ${selected ? 'bg-secondary' : ''}`}
                  onClick={() => {
                    onSelect(sketch.id)
                    onOpenChange(false)
                  }}
                >
                  <span className="block truncate text-sm font-medium">{sketch.name}</span>
                  <span className="block font-mono text-xs text-muted-foreground">{formatUpdatedAt(sketch.updatedAt)}</span>
                </button>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Rename ${sketch.name}`} onClick={() => onRename(sketch.id)}>
                  <Pencil />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Delete ${sketch.name}`} onClick={() => onDelete(sketch.id)}>
                  <Trash2 />
                </Button>
              </li>
            )
          })}
        </ul>
        <div className="border-t px-4 py-3">
          <Button type="button" variant="outline" className="w-full" onClick={() => {
            onCreate()
            onOpenChange(false)
          }}>
            <Plus data-icon="inline-start" />
            New sketch
          </Button>
        </div>
      </div>
    </div>
  )
}

export function promptSketchName(current: string, action: 'create' | 'rename') {
  const label = action === 'create' ? 'Name for the new sketch' : 'Rename sketch'
  const next = window.prompt(label, current)
  if (next === null) return null
  const trimmed = next.trim()
  return trimmed || current
}
