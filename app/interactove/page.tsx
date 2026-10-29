import type { Metadata } from 'next'
import { SketchPlayground } from '@/components/sketch-playground'
import { WorkspaceHeader } from '@/components/workspace-header'

export const metadata: Metadata = {
  title: 'Interactive playground — Sketchbook',
  description: 'Explore a responsive p5.js ribbon sketch with playback controls.',
}

export default function Page() {
  return (
    <div className="min-h-screen">
      <WorkspaceHeader active="interactove" />
      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-7 flex flex-col gap-3 sm:mb-8">
          <p className="font-mono text-sm text-primary">YOUR CREATIVE CODING PLAYGROUND</p>
          <h1 className="text-balance text-4xl font-medium tracking-tight sm:text-5xl">Start with a sketch.</h1>
          <p className="text-pretty text-base leading-relaxed text-muted-foreground">An open canvas for your next idea. Play, experiment, repeat.</p>
        </div>
        <SketchPlayground drawingEnabled={false} />
        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>Built for happy accidents.</span>
          <span className="font-mono">Next.js + TypeScript + p5.js</span>
        </footer>
      </main>
    </div>
  )
}

