'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { Code2, Download, Play, RotateCcw, Square, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChangeSketchButton, SketchPicker, promptSketchName } from '@/components/sketch-picker'
import { ribbonExample, triangleExample } from '@/lib/ide/examples'
import {
  createCodeSketch,
  deleteSketch,
  getActiveSketch,
  loadCodeStore,
  renameSketch,
  saveCodeStore,
  setActiveSketch,
  updateCodeContent,
  upsertSketch,
} from '@/lib/sketches/storage'
import type { CodeSketch, SketchStore } from '@/lib/sketches/types'

const CodeEditor = dynamic(() => import('./code-editor'), { ssr: false, loading: () => <p className="p-6 text-sm text-muted-foreground">Loading editor…</p> })
type ConsoleEntry = { level: string; text: string }
type Run = { id: number; code: string }

export function SketchIDE() {
  const [store, setStore] = useState<SketchStore<CodeSketch> | null>(null)
  const storeRef = useRef<SketchStore<CodeSketch> | null>(null)
  const [code, setCode] = useState('')
  const [run, setRun] = useState<Run | null>(null)
  const [status, setStatus] = useState('Starting')
  const [logs, setLogs] = useState<ConsoleEntry[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const frame = useRef<HTMLIFrameElement>(null)
  const runId = useRef(1)
  const saveTimer = useRef<number | null>(null)
  const codeRef = useRef('')
  const dirty = run !== null && code !== run.code
  const active = store ? getActiveSketch(store) : null

  useEffect(() => {
    const loaded = loadCodeStore()
    storeRef.current = loaded
    setStore(loaded)
    const sketch = getActiveSketch(loaded)
    codeRef.current = sketch.code
    setCode(sketch.code)
    setRun({ id: runId.current, code: sketch.code })
    setHydrated(true)
  }, [])

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow || event.data?.channel !== 'sketchbook') return
      const { type, text, level } = event.data
      if (type === 'running') setStatus(current => current === 'Error' ? current : 'Running')
      if (type === 'error') setStatus('Error')
      if ((type === 'console' || type === 'error') && typeof text === 'string') {
        setLogs(current => [...current.slice(-99), { level: String(level || 'log').slice(0, 12), text: text.slice(0, 4000) }])
      }
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [])

  useEffect(() => {
    if (!run) return
    const timeout = window.setTimeout(() => {
      setStatus(current => current === 'Starting' ? 'Not responding' : current)
    }, 10000)
    return () => window.clearTimeout(timeout)
  }, [run])

  useEffect(() => {
    function flushPending() {
      if (saveTimer.current === null) return
      window.clearTimeout(saveTimer.current)
      saveTimer.current = null
      const current = storeRef.current
      if (!current) return
      const next = updateCodeContent(current, current.activeId, codeRef.current)
      storeRef.current = next
      saveCodeStore(next)
    }
    window.addEventListener('pagehide', flushPending)
    return () => {
      window.removeEventListener('pagehide', flushPending)
      flushPending()
    }
  }, [])

  function persist(next: SketchStore<CodeSketch>) {
    storeRef.current = next
    saveCodeStore(next)
    setStore(next)
  }

  function persistCode(nextCode: string) {
    const current = storeRef.current
    if (!current) return
    persist(updateCodeContent(current, current.activeId, nextCode))
  }

  function handleCodeChange(nextCode: string) {
    codeRef.current = nextCode
    setCode(nextCode)
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      persistCode(nextCode)
      saveTimer.current = null
    }, 300)
  }

  function execute(source = code) {
    setLogs([])
    setStatus('Starting')
    setRun({ id: ++runId.current, code: source })
  }

  function loadExample(source: string) {
    if (code !== ribbonExample && code !== triangleExample && code.trim().length > 0
      && !window.confirm('Replace the current code? Download it first if you want to keep it.')) return
    codeRef.current = source
    setCode(source)
    persistCode(source)
    execute(source)
  }

  function download() {
    const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${(active?.name || 'sketch').replace(/[^\w\-]+/g, '-').toLowerCase() || 'sketch'}.js`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function flushCodeNow() {
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    persistCode(codeRef.current)
  }

  function handleSelect(id: string) {
    const current = storeRef.current
    if (!current || id === current.activeId) return
    flushCodeNow()
    const next = setActiveSketch(storeRef.current ?? current, id)
    persist(next)
    const sketch = getActiveSketch(next)
    codeRef.current = sketch.code
    setCode(sketch.code)
    execute(sketch.code)
  }

  function handleCreate() {
    const name = promptSketchName('Untitled sketch', 'create')
    if (name === null) return
    const current = storeRef.current
    if (!current) return
    flushCodeNow()
    const sketch = createCodeSketch({ name, code: ribbonExample })
    const next = upsertSketch(storeRef.current ?? current, sketch)
    persist(next)
    codeRef.current = sketch.code
    setCode(sketch.code)
    execute(sketch.code)
  }

  function handleRename(id: string) {
    const current = storeRef.current
    if (!current) return
    const sketch = current.sketches.find(entry => entry.id === id)
    if (!sketch) return
    const name = promptSketchName(sketch.name, 'rename')
    if (name === null) return
    persist(renameSketch(current, id, name))
  }

  function handleDelete(id: string) {
    const current = storeRef.current
    if (!current) return
    const sketch = current.sketches.find(entry => entry.id === id)
    if (!sketch) return
    if (!window.confirm(`Delete “${sketch.name}”? This cannot be undone.`)) return
    const wasActive = current.activeId === id
    if (wasActive) flushCodeNow()
    const next = deleteSketch(storeRef.current ?? current, id, () => createCodeSketch())
    persist(next)
    if (wasActive) {
      const activeSketch = getActiveSketch(next)
      codeRef.current = activeSketch.code
      setCode(activeSketch.code)
      execute(activeSketch.code)
    }
  }

  if (!hydrated || !store || !active) {
    return <p className="p-6 text-sm text-muted-foreground">Loading sketches…</p>
  }

  return (
    <section className="flex flex-col gap-6" onKeyDown={event => {
      if (event.nativeEvent.isComposing || event.keyCode === 229) return
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault()
        execute()
      }
    }}>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-sm text-primary">CODE → CANVAS</p>
          <h1 className="text-balance text-3xl font-medium tracking-tight sm:text-4xl">Make something unexpected.</h1>
          <p className="text-pretty text-sm leading-6 text-muted-foreground">Write a little JavaScript. Run it. See where it takes you.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ChangeSketchButton onClick={() => setPickerOpen(true)} />
          <Button onClick={() => execute()}><Play data-icon="inline-start" />Run sketch</Button>
          <Button variant="outline" onClick={() => { setRun(null); setStatus('Stopped') }} disabled={!run}><Square data-icon="inline-start" />Stop</Button>
          <Button variant="ghost" onClick={download} aria-label="Download sketch JavaScript"><Download /></Button>
        </div>
      </div>

      <SketchPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        sketches={store.sketches}
        activeId={store.activeId}
        onSelect={handleSelect}
        onCreate={handleCreate}
        onRename={handleRename}
        onDelete={handleDelete}
      />

      <div className="grid min-w-0 overflow-hidden rounded-xl border lg:grid-cols-2">
        <section aria-label="Code editor" className="min-w-0 border-b lg:border-r lg:border-b-0">
          <div className="flex min-h-12 items-center justify-between border-b bg-card px-4 text-card-foreground">
            <span className="flex min-w-0 items-center gap-2 font-mono text-sm">
              <Code2 className="size-4 shrink-0" />
              <span className="truncate">{active.name}</span>
            </span>
            <span className="shrink-0 text-sm text-muted-foreground">{dirty ? 'Unrun changes' : 'Saved locally'}</span>
          </div>
          <CodeEditor value={code} onChange={handleCodeChange} />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-sm text-muted-foreground">
            <span className="font-mono">{code.split('\n').length} lines</span>
            <span>Ctrl / ⌘ + Enter to run</span>
          </div>
        </section>
        <section aria-label="Live preview" className="flex min-w-0 flex-col bg-card text-card-foreground">
          <div className="flex min-h-12 items-center justify-between border-b px-4">
            <h2 className="text-sm font-medium">Preview</h2>
            <span role="status" className="font-mono text-sm text-muted-foreground">{status}</span>
          </div>
          <div className="flex min-h-80 flex-1 items-center justify-center">
            {run ? <iframe key={run.id} ref={frame} title="Live p5.js sketch" src="/sketch-runner.html" sandbox="allow-scripts" className="aspect-[5/4] w-full border-0" onLoad={() => {
              frame.current?.contentWindow?.postMessage({ channel: 'sketchbook', type: 'run', code: run.code }, '*')
            }} /> : <p className="p-6 text-sm text-muted-foreground">Preview stopped. Run your sketch to start again.</p>}
          </div>
          <div className="border-t px-4 py-3 text-sm text-muted-foreground">Isolated preview · p5.js instance mode</div>
        </section>
      </div>

      <section aria-label="Sketch console" className="overflow-hidden rounded-xl border">
        <div className="flex items-center justify-between border-b bg-card px-4 py-2 text-card-foreground">
          <h2 className="flex items-center gap-2 text-sm font-medium"><Terminal className="size-4" />Console <span className="font-mono text-muted-foreground">{logs.length}</span></h2>
          <Button variant="ghost" size="sm" onClick={() => setLogs([])}>Clear</Button>
        </div>
        <div className="max-h-60 min-h-24 overflow-auto p-4 font-mono text-sm" role="log" aria-live="off">
          {logs.length === 0 ? <p className="text-muted-foreground">Console output and errors will appear here.</p> : logs.map((entry, i) => <pre key={i} className={`whitespace-pre-wrap break-all leading-6 ${entry.level === 'error' ? 'text-primary' : 'text-foreground'}`}>{entry.level === 'error' ? 'Error: ' : ''}{entry.text}</pre>)}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">Try a starting point:</span>
          <Button variant="outline" size="sm" onClick={() => loadExample(ribbonExample)}><RotateCcw data-icon="inline-start" />Ribbon study</Button>
          <Button variant="outline" size="sm" onClick={() => loadExample(triangleExample)}>Click-to-draw triangles</Button>
        </div>
        <p className="text-muted-foreground">Drafts autosave in this browser.</p>
      </div>
      <details className="rounded-xl border p-5 text-sm leading-6">
        <summary className="cursor-pointer font-medium">Your toolkit: p5.js + project utilities</summary>
        <div className="mt-4 flex flex-col gap-3 text-muted-foreground">
          <p>Use <code className="font-mono text-foreground">p.setup</code>, <code className="font-mono text-foreground">p.draw</code>, and all p5 methods on <code className="font-mono text-foreground">p</code>. Write JavaScript, not TypeScript or module imports.</p>
          <p>Project utilities are available through <code className="font-mono text-foreground">helpers</code>: getMouseCoordinates, showMouseCoordinates, logMouseCoordinates, createLinearGradient, createRadialGradient, applyGradientFill, createTriangleCapture, createRectangleCapture, createEllipseCapture, and their draw functions.</p>
          <p>Run starts a fresh preview; Stop removes it. Sketches run with no access to the editor&apos;s document or storage. Avoid infinite loops: an iframe isolates access, not CPU usage.</p>
          <a className="text-primary underline underline-offset-4" href="https://p5js.org/reference/" target="_blank" rel="noreferrer">Open p5.js reference (new tab)</a>
        </div>
      </details>
    </section>
  )
}
