import type { Metadata } from 'next'
import { SketchPlayground } from '@/components/sketch-playground'
import { WorkspaceHeader } from '@/components/workspace-header'

export const metadata: Metadata = {
  title: 'Interactive playground — Sketchbook',
  description: 'Start with a blank canvas. Insert triangles, rectangles, and ellipses, reset your canvas, and export your artwork.',
}

export default function Page() {
  return (
    <div className="min-h-screen">
      <WorkspaceHeader active="interactove" />
      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-7 flex flex-col gap-3 sm:mb-8">
          <p className="font-mono text-sm text-primary">INTERACTIVE MODE</p>
          <h1 className="text-balance text-4xl font-medium tracking-tight sm:text-5xl">Your canvas. Your ideas.</h1>
          <p className="text-pretty text-base leading-relaxed text-muted-foreground">Choose a shape, then place its points on the canvas. No code needed.</p>
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

