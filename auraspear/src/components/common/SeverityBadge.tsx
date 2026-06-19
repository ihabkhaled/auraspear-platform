'use client'

import { Badge } from '@/components/ui'
import {
  SEVERITY_TEXT_CLASSES,
  SEVERITY_BG_CLASSES,
  SEVERITY_BORDER_CLASSES,
} from '@/lib/constants'
import { getSeverityKey } from '@/lib/severity-utils'
import { cn, lookup } from '@/lib/utils'
import type { SeverityBadgeProps } from '@/types'

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const key = getSeverityKey(severity)
  const textClass = lookup(SEVERITY_TEXT_CLASSES, key) ?? 'text-severity-info'
  const bgClass = lookup(SEVERITY_BG_CLASSES, key) ?? 'bg-severity-info'
  const borderClass = lookup(SEVERITY_BORDER_CLASSES, key) ?? 'border-severity-info'

  return (
    <Badge variant="outline" className={cn('gap-1.5 border', textClass, bgClass, borderClass)}>
      <span
        className={cn('inline-block h-1.5 w-1.5 rounded-full')}
        style={{ backgroundColor: `var(--severity-${severity})` }}
      />
      <span className="capitalize">{severity}</span>
    </Badge>
  )
}
