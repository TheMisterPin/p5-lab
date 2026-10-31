import { Check, Circle, CircleDashed, Code2, Diamond, Download, FileDown, FolderOpen, Minus, MousePointer2, Move, Plus, Redo2, RectangleHorizontal, RotateCw, Scaling, Square, Triangle, Undo2, Waypoints } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { editableVertices, type SceneObject, type ShapeKind } from '@/lib/editor/scene'
import { IconButton } from './icon-button'
import type { Tool, Mode } from './use-canvas-tools'

const creation = [ ['triangle', 'Triangle', Triangle], ['rectangle', 'Rectangle', RectangleHorizontal], ['ellipse', 'Ellipse', CircleDashed], ['circle', 'Circle', Circle], ['square', 'Square', Square], ['quad', 'Quad', Diamond], ['line', 'Line', Minus], ['polyline', 'Connected dots', Waypoints] ] as const
export function EditorToolbar({ tool, mode, setTool, setMode, selected, ready, canUndo, canRedo, undo, redo, finish, canFinish, addCentered, png, code, js, project, importProject }: {
  tool: Tool; mode: Mode; setTool: (t: Tool) => void; setMode: (m: Mode) => void; selected?: SceneObject; ready: boolean
  canUndo: boolean; canRedo: boolean; undo: () => void; redo: () => void; finish: () => void; canFinish: boolean
  addCentered: () => void; png: () => void; code: () => void; js: () => void; project: () => void; importProject: () => void
}) {
  return <div className="flex shrink-0 flex-wrap items-center gap-1 border-b bg-background p-1.5">
    <div className="flex flex-wrap" role="toolbar" aria-label="Shape tools">
      <IconButton label="Select" shortcut="V" active={tool === 'select'} disabled={!ready} onClick={() => setTool('select')}><MousePointer2 /></IconButton>
      {creation.map(([type, label, Icon], i) => <IconButton key={type} label={label} shortcut={String(i + 1)} active={tool === type} disabled={!ready} onClick={() => setTool(type)}><Icon /></IconButton>)}
      {tool !== 'select' && tool !== 'polyline' && <IconButton label="Add centered" disabled={!ready} onClick={addCentered}><Plus /></IconButton>}
      {tool === 'polyline' && <IconButton label="Finish" shortcut="Enter" disabled={!canFinish} onClick={finish}><Check /></IconButton>}
    </div>
    <span className="mx-1 h-5 border-l" />
    <div className="flex" role="toolbar" aria-label="Transform tools">
      {([['move', 'Move', 'W', Move], ['rotate', 'Rotate', 'E', RotateCw], ['scale', 'Scale', 'R', Scaling], ['vertices', 'Vertices', 'T', Waypoints]] as const).map(([value, label, shortcut, Icon]) => <IconButton key={value} label={label} shortcut={shortcut} active={mode === value && tool === 'select'} disabled={!selected || selected.locked || (value === 'vertices' && !editableVertices(selected))} onClick={() => setMode(value)}><Icon /></IconButton>)}
    </div>
    <span className="mx-1 h-5 border-l" />
    <IconButton label="Undo" shortcut="Ctrl/⌘ Z" disabled={!canUndo} onClick={undo}><Undo2 /></IconButton>
    <IconButton label="Redo" shortcut="Ctrl/⌘ Shift Z" disabled={!canRedo} onClick={redo}><Redo2 /></IconButton>
    <div className="ml-auto flex items-center gap-1">
      <details className="relative">
        <summary className="cursor-pointer list-none rounded border px-2 py-1.5 text-xs focus-visible:outline-2 focus-visible:outline-ring">File</summary>
        <div className="absolute right-0 z-40 mt-1 flex w-44 flex-col items-stretch rounded border bg-background p-1 shadow-md" onClick={e => { if ((e.target as Element).closest('button')) e.currentTarget.closest('details')?.removeAttribute('open') }}>
          <Button variant="ghost" className="justify-start" onClick={project}><FileDown />Download Project</Button>
          <Button variant="ghost" className="justify-start" onClick={importProject}><FolderOpen />Import Project</Button>
          <Button variant="ghost" className="justify-start" disabled={!ready} onClick={png}><Download />Save PNG</Button>
          <Button variant="ghost" className="justify-start" onClick={js}><Code2 />Download JS</Button>
        </div>
      </details>
      <Button disabled={!ready} onClick={code}><Code2 />Open in code editor</Button>
    </div>
  </div>
}
export const shortcutTools: Record<string, ShapeKind> = Object.fromEntries(creation.map(([type], i) => [String(i + 1), type]))
