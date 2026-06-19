'use client'

import { cn } from '@/lib/utils'
import type { AppLogDetailRowProps } from '@/types'

export function AppLogDetailRow({ label, value, isError }: AppLogDetailRowProps) {
  if (!value) {
    return null
  }

  return (
    <div className="border-border grid grid-cols-1 gap-2 border-b py-2 text-sm sm:grid-cols-3">
      <span className="text-muted-foreground font-medium">{label}</span>
      <span className={cn('col-span-2 font-mono text-xs break-all', isError && 'text-destructive')}>
        {value}
      </span>
    </div>
  )
}
