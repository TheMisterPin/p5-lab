import type { Metadata } from 'next'
import { WorkspaceHeader } from '@/components/workspace-header'
import { SketchIDE } from '@/components/ide/sketch-ide'
export const metadata: Metadata = { title: 'Code editor — Sketchbook' }
export default function IDEPage() {
  return <div className="editor-shell flex h-dvh flex-col overflow-hidden"><WorkspaceHeader active="ide" /><main className="flex min-h-0 flex-1 flex-col"><SketchIDE /></main></div>
}
