'use client'

import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { AiResultCardProps } from '@/types'

export function AiResultCard({ result, isLoading, label, className }: AiResultCardProps) {
  if (isLoading) {
    return (
      <div className={cn('bg-muted/50 flex items-center justify-center rounded-lg p-6', className)}>
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (!result?.result) {
    return null
  }

  return (
    <div className={cn('bg-muted/50 space-y-2 rounded-lg p-3', className)}>
      {label && <p className="text-muted-foreground text-xs font-medium uppercase">{label}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {typeof result.confidence === 'number' && (
          <Badge variant="outline" className="text-xs">
            {`${String(Math.round(result.confidence))}%`}
          </Badge>
        )}
        {(result.provider ?? result.model) && (
          <Badge variant="secondary" className="text-xs">
            {result.provider ?? result.model}
          </Badge>
        )}
      </div>
      <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">{result.result}</p>
    </div>
  )
}
