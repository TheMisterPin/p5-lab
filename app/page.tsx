import Link from 'next/link'
import { Code2, MousePointer2 } from 'lucide-react'
import { SketchPlayground } from '@/components/sketch-playground'
import { WorkspaceHeader } from '@/components/workspace-header'
import { buttonVariants } from '@/components/ui/button'
export default function Page() {
  return <div className="flex min-h-dvh flex-col">
    <WorkspaceHeader active="home" />
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 p-4">
      <div className="flex flex-wrap gap-2">
        <Link href="/interactove" className={buttonVariants()}><MousePointer2 />Visual editor</Link>
        <Link href="/ide" className={buttonVariants({ variant: 'outline' })}><Code2 />Code editor</Link>
      </div>
      <SketchPlayground drawingEnabled={false} />
    </main>
  </div>
}
