import { ArrowUpRight } from 'lucide-react'
import { SketchPlayground } from '@/components/sketch-playground'

export default function Page() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5 sm:px-10">
          <a href="/" className="flex items-center gap-3" aria-label="Sketchbook home">
            <span className="font-mono text-2xl font-bold tracking-tighter text-primary">p5*</span>
            <span className="text-base font-semibold tracking-tight">sketchbook</span>
          </a>
          <a href="https://p5js.org/" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">Made with p5.js<ArrowUpRight className="size-4" /><span className="sr-only"> (opens in a new tab)</span></a>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-7 flex flex-col gap-3 sm:mb-8">
          <p className="font-mono text-sm text-primary">YOUR CREATIVE CODING PLAYGROUND</p>
          <h1 className="text-balance text-4xl font-medium tracking-tight sm:text-5xl">Start with a sketch.</h1>
          <p className="text-pretty text-base leading-relaxed text-muted-foreground">An open canvas for your next idea. Play, experiment, repeat.</p>
        </div>
        <SketchPlayground />
        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>Built for happy accidents.</span>
          <span className="font-mono">Next.js + TypeScript + p5.js</span>
        </footer>
      </main>
    </div>
  )
}

