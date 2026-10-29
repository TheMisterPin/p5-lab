import type { Metadata } from 'next'
import { WorkspaceHeader } from '@/components/workspace-header'
import { SketchIDE } from '@/components/ide/sketch-ide'

export const metadata: Metadata = {
  title: 'Code editor — Sketchbook',
  description: 'Write JavaScript sketches, run p5.js in an isolated preview, and explore coordinate, gradient, and shape utilities.',
}

export default function IDEPage() {
  return (
    <div className="min-h-screen">
      <WorkspaceHeader active="ide" />
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <SketchIDE />
      </main>
    </div>
  )
}
