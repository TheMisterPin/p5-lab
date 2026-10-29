import Link from 'next/link'
import { ArrowRight, Code2, MousePointer2 } from 'lucide-react'
import { SketchPlayground } from '@/components/sketch-playground'
import { WorkspaceHeader } from '@/components/workspace-header'
import { buttonVariants } from '@/components/ui/button'

export default function Page() {
  return (
    <div className="min-h-screen">
      <WorkspaceHeader active="home" />
      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-8 flex flex-col gap-4">
          <p className="font-mono text-sm text-primary">YOUR CREATIVE CODING PLAYGROUND</p>
          <h1 className="text-balance text-4xl font-medium tracking-tight sm:text-5xl">Start with a sketch.</h1>
          <p className="text-pretty text-base leading-relaxed text-muted-foreground">An open canvas for your next idea. Build with shapes or bring it to life with code.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/interactove" className={buttonVariants({ size: 'lg' })}><MousePointer2 data-icon="inline-start" />Start interactively<ArrowRight data-icon="inline-end" /></Link>
            <Link href="/ide" className={buttonVariants({ variant: 'outline', size: 'lg' })}><Code2 data-icon="inline-start" />Open code editor</Link>
          </div>
          <p className="text-sm text-muted-foreground">Two ways to create. One place to experiment.</p>
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
