import type { Metadata } from 'next'
import { SketchPlayground } from '@/components/sketch-playground'
import { WorkspaceHeader } from '@/components/workspace-header'

export const metadata: Metadata = {
  title: 'Visual editor — Sketchbook',
  description: 'Draw shapes, move, rotate, and scale them, then open your artwork as editable p5.js code.',
}

export default function Page() {
  return (
    <div className="min-h-screen">
      <WorkspaceHeader active="interactove" />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-6 flex flex-col gap-2">
          <p className="font-mono text-xs text-primary">CANVAS → CODE</p>
          <h1 className="text-balance text-2xl font-medium tracking-tight sm:text-3xl">Shape your next sketch.</h1>
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground">Draw it. Transform it. Make it your own in p5.js.</p>
        </div>
        <SketchPlayground drawingEnabled />
        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>Built for happy accidents.</span>
          <span className="font-mono">Next.js + TypeScript + p5.js</span>
        </footer>
      </main>
    </div>
  )
}

