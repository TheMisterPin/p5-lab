import Link from 'next/link'
import { cn } from '@/lib/utils'

export function WorkspaceHeader({ active }: { active: 'home' | 'interactove' | 'ide' }) {
  return (
    <header className="border-b bg-background text-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Sketchbook home">
          <span className="font-mono text-2xl font-bold tracking-tighter text-primary">p5*</span>
          <span className="font-semibold tracking-tight">sketchbook</span>
        </Link>
        <nav aria-label="Workspace" className="flex items-center gap-1">
          {([['interactove', 'Visual editor'], ['ide', 'Code editor']] as const).map(([route, label]) => (
            <Link key={route} href={`/${route}`} aria-current={active === route ? 'page' : undefined} className={cn('rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring', active === route ? 'bg-secondary text-foreground' : 'text-muted-foreground')}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
