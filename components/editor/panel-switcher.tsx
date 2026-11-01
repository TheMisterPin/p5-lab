'use client'

import { useRef } from 'react'

const panels = ['hierarchy', 'canvas', 'inspector'] as const
export type Panel = typeof panels[number]
export function PanelSwitcher({ value, onChange }: { value: Panel; onChange: (value: Panel) => void }) {
  const touch = useRef<{ id: number; x: number; y: number } | null>(null)
  return <div className="editor-panel-switch shrink-0 border-b" role="tablist" aria-label="Workspace panels">
    {panels.map((panel, index) => <button key={panel} type="button" role="tab" aria-selected={value === panel} aria-controls={`editor-${panel}`} tabIndex={value === panel ? 0 : -1}
      onClick={() => onChange(panel)} onPointerDown={event => {
        if (event.pointerType === 'touch' && event.isPrimary) touch.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
      }} onPointerCancel={() => { touch.current = null }} onPointerLeave={() => { touch.current = null }} onPointerUp={event => {
        const start = touch.current
        touch.current = null
        // A touch drag on the canvas can suppress the next compatibility click.
        // Complete a stationary tab tap directly; native click remains idempotent.
        if (start?.id === event.pointerId && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 8) {
          onChange(panel); event.currentTarget.focus()
        }
      }} onKeyDown={event => {
        const next = event.key === 'ArrowRight' ? (index + 1) % 3 : event.key === 'ArrowLeft' ? (index + 2) % 3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : null
        if (next === null) return
        event.preventDefault(); onChange(panels[next]); event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button')[next].focus()
      }}>{panel[0].toUpperCase() + panel.slice(1)}</button>)}
  </div>
}
