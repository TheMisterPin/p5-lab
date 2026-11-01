'use client'

import { useEffect, useRef, useState, type RefObject, type PointerEvent as PE, type MouseEvent as ME } from 'react'
import { fitViewport, panViewport, zoomAt, type Size, type Viewport } from '@/lib/editor/viewport'

const editableTarget = (target: EventTarget | null) => target instanceof Element && !!target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')

export function useViewport(stage: RefObject<HTMLDivElement | null>, artwork: Size) {
  const [view, setView] = useState<Viewport>({ x: 0, y: 0, scale: 1 })
  const current = useRef(view), fitMode = useRef(true)
  const size = useRef<Size>({ width: 0, height: 0 })
  const artworkRef = useRef(artwork)
  const [space, setSpace] = useState(false), spaceRef = useRef(false)
  const [panTool, setPanTool] = useState(false)
  const [panning, setPanning] = useState(false)
  const hovered = useRef(false), editing = useRef(false), suppressClick = useRef(false)
  const pan = useRef<{ id: number; start: { x: number; y: number }; view: Viewport } | null>(null)
  function update(next: Viewport) { current.current = next; setView(next) }
  function fit() {
    fitMode.current = true
    if (size.current.width > 0 && size.current.height > 0) update(fitViewport(size.current, artworkRef.current))
  }
  function zoom(scale: number) {
    fitMode.current = false
    update(zoomAt(current.current, scale, { x: size.current.width / 2, y: size.current.height / 2 }))
  }
  useEffect(() => {
    artworkRef.current = artwork
    if (fitMode.current) fit()
  }, [artwork.width, artwork.height])
  useEffect(() => {
    const element = stage.current
    if (!element) return
    const observer = new ResizeObserver(() => {
      const nextSize = { width: element.clientWidth, height: element.clientHeight }, previous = size.current
      if (!nextSize.width || !nextSize.height) return
      size.current = nextSize
      if (fitMode.current) update(fitViewport(nextSize, artworkRef.current))
      else if (previous.width && previous.height) update(panViewport(current.current, { x: (nextSize.width - previous.width) / 2, y: (nextSize.height - previous.height) / 2 }))
    })
    observer.observe(element)
    function wheel(event: WheelEvent) {
      event.preventDefault()
      // Keep the gesture's coordinate system fixed until its pointer is released.
      if (editing.current || pan.current) return
      const rect = element!.getBoundingClientRect()
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? size.current.height : 1)
      const factor = Math.exp(-Math.max(-500, Math.min(500, delta)) * (event.ctrlKey ? 0.01 : 0.002))
      fitMode.current = false
      update(zoomAt(current.current, current.current.scale * factor, { x: event.clientX - rect.left, y: event.clientY - rect.top }))
    }
    element.addEventListener('wheel', wheel, { passive: false })
    function keyDown(event: KeyboardEvent) {
      if (event.code !== 'Space' || editableTarget(event.target) || event.ctrlKey || event.metaKey || event.altKey || !(hovered.current || (event.target instanceof Node && element!.contains(event.target)))) return
      event.preventDefault(); spaceRef.current = true; setSpace(true)
    }
    function keyUp(event: KeyboardEvent) { if (event.code === 'Space') { spaceRef.current = false; setSpace(false) } }
    function blur() {
      spaceRef.current = false; setSpace(false); editing.current = false
      pan.current = null; setPanning(false)
    }
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    window.addEventListener('blur', blur)
    return () => { observer.disconnect(); element.removeEventListener('wheel', wheel); window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); window.removeEventListener('blur', blur) }
  }, [])
  function pointerDown(event: PE<HTMLDivElement>) {
    if (event.button !== 0 || pan.current) return
    if (!spaceRef.current && !panTool) { suppressClick.current = false; editing.current = true; return }
    event.preventDefault(); event.stopPropagation(); event.currentTarget.focus()
    fitMode.current = false; suppressClick.current = true
    pan.current = { id: event.pointerId, start: { x: event.clientX, y: event.clientY }, view: current.current }
    setPanning(true); event.currentTarget.setPointerCapture(event.pointerId)
  }
  function pointerMove(event: PE<HTMLDivElement>) {
    const drag = pan.current
    if (!drag || drag.id !== event.pointerId) return
    event.preventDefault(); event.stopPropagation()
    update(panViewport(drag.view, { x: event.clientX - drag.start.x, y: event.clientY - drag.start.y }))
  }
  function pointerEnd(event: PE<HTMLDivElement>, canceled = false) {
    editing.current = false
    const drag = pan.current
    if (!drag || drag.id !== event.pointerId) return
    event.preventDefault(); event.stopPropagation()
    pan.current = null; setPanning(false)
    if (canceled) update(drag.view)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  return {
    view, space, panTool, panning, fit, zoom, togglePan: () => setPanTool(on => !on),
    events: {
      onPointerEnter: () => { hovered.current = true }, onPointerLeave: () => { hovered.current = false },
      onPointerDownCapture: pointerDown, onPointerMoveCapture: pointerMove,
      onPointerUpCapture: (event: PE<HTMLDivElement>) => pointerEnd(event), onPointerCancelCapture: (event: PE<HTMLDivElement>) => pointerEnd(event, true),
      onLostPointerCapture: () => { editing.current = false; if (pan.current) { pan.current = null; setPanning(false) } },
      onClickCapture: (event: ME<HTMLDivElement>) => { if (suppressClick.current) { suppressClick.current = false; event.preventDefault(); event.stopPropagation() } },
    },
  }
}
