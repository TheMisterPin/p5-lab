import type { Metadata } from 'next'
import { SketchPlayground } from '@/components/sketch-playground'
import { WorkspaceHeader } from '@/components/workspace-header'
export const metadata: Metadata = { title: 'Visual editor — Sketchbook' }
export default function Page() {
  return <div className="editor-shell flex h-dvh flex-col overflow-hidden">
    <WorkspaceHeader active="interactove" />
    <main className="flex min-h-0 flex-1 flex-col"><SketchPlayground drawingEnabled /></main>
  </div>
}
