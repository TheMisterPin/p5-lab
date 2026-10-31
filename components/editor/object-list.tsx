import { ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpToLine, Copy, Eye, EyeOff, Lock, LockOpen, Trash2 } from 'lucide-react'
import { duplicateObject, reorderObject, replaceObject, type SceneObject } from '@/lib/editor/scene'
import type { SceneController } from './use-scene-history'
import { IconButton } from './icon-button'

export function ObjectList({ state, selected, select }: { state: SceneController; selected?: SceneObject; select: (id: string) => void }) {
  function flag(o: SceneObject, key: 'visible' | 'locked') {
    state.commit(replaceObject(state.current(), { ...o, [key]: !o[key] }))
  }
  return <section aria-label="Objects" className="flex min-h-0 flex-1 flex-col">
    <div className="flex shrink-0 items-center justify-between border-b px-3 py-1"><h2 className="text-xs font-semibold">Objects <span className="text-muted-foreground">{state.scene.objects.length}</span></h2></div>
    <div className="flex shrink-0 gap-0.5 border-b px-1">
      <IconButton label="Duplicate" shortcut="Ctrl/⌘ D" disabled={!selected} onClick={() => { if (!selected) return; const result = duplicateObject(state.current(), selected.id); if (result) { state.commit(result.scene); select(result.id) } }}><Copy /></IconButton>
      {([['back', 'Send to back', ArrowDownToLine], ['backward', 'Send backward', ArrowDown], ['forward', 'Bring forward', ArrowUp], ['front', 'Bring to front', ArrowUpToLine]] as const).map(([action, label, Icon]) => <IconButton key={action} label={label} disabled={!selected || (action === 'front' || action === 'forward' ? state.scene.objects.at(-1)?.id === selected.id : state.scene.objects[0]?.id === selected.id)} onClick={() => selected && state.commit(reorderObject(state.current(), selected.id, action))}><Icon /></IconButton>)}
      <IconButton label="Delete" shortcut="Del" disabled={!selected || selected.locked} onClick={() => selected && state.commit({ ...state.current(), objects: state.current().objects.filter(o => o.id !== selected.id) })}><Trash2 /></IconButton>
    </div>
    <ul aria-label="Scene objects" className="min-h-0 flex-1 overflow-y-auto p-1">
      {[...state.scene.objects].reverse().map(o => <li key={o.id} className={`flex items-center rounded ${o.id === selected?.id ? 'bg-primary/10 text-primary' : ''}`}>
        <button type="button" className={`min-h-8 min-w-0 flex-1 truncate rounded px-2 text-left text-xs focus-visible:outline-2 focus-visible:outline-ring ${!o.visible ? 'text-muted-foreground' : ''}`} aria-pressed={o.id === selected?.id} onClick={() => select(o.id)}>{o.name || o.type}</button>
        <IconButton size="icon-sm" label={`${o.visible ? 'Hide' : 'Show'} ${o.name}`} onClick={() => flag(o, 'visible')}>{o.visible ? <Eye /> : <EyeOff />}</IconButton>
        <IconButton size="icon-sm" label={`${o.locked ? 'Unlock' : 'Lock'} ${o.name}`} onClick={() => flag(o, 'locked')}>{o.locked ? <Lock /> : <LockOpen />}</IconButton>
      </li>)}
    </ul>
  </section>
}
