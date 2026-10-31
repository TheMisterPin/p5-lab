import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
export function IconButton({ label, shortcut, active, children, ...props }: ComponentProps<typeof Button> & { label: string; shortcut?: string; active?: boolean }) {
  return <Button type="button" variant={active ? 'secondary' : 'ghost'} size="icon" aria-label={label} title={`${label}${shortcut ? ` (${shortcut})` : ''}`} aria-pressed={active} {...props}>{children}</Button>
}
