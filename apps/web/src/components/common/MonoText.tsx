import { cn } from '@/lib/utils'
import type { MonoTextProps } from '@/types'

export function MonoText({ children, className }: MonoTextProps) {
  return (
    <span
      className={cn('bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs', className)}
    >
      {children}
    </span>
  )
}
