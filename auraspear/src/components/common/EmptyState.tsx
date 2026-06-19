import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EmptyStateProps } from '@/types'

export function EmptyState({ icon, title, description, className, children }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12', className)}>
      <div className="bg-muted text-muted-foreground flex h-12 w-12 items-center justify-center rounded-full">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="text-muted-foreground mt-1 text-xs">{description}</p>}
      </div>
      {children}
    </div>
  )
}
