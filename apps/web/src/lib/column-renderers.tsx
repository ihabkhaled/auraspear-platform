import { Badge } from '@/components/ui'
import { BadgeVariant } from '@/enums'
import { formatTimestamp, lookup } from '@/lib/utils'
import type { ReactNode } from 'react'

export function renderSeverityBadge(value: unknown): ReactNode {
  const severity = value as string | null
  if (!severity) {
    return <span className="text-muted-foreground">-</span>
  }
  const variantMap: Record<string, BadgeVariant> = {
    critical: BadgeVariant.DESTRUCTIVE,
    high: BadgeVariant.DESTRUCTIVE,
    medium: BadgeVariant.WARNING,
    low: BadgeVariant.INFO,
    info: BadgeVariant.SECONDARY,
  }
  return (
    <Badge
      variant={lookup(variantMap, severity) ?? BadgeVariant.OUTLINE}
      className="text-xs capitalize"
    >
      {severity}
    </Badge>
  )
}

export function renderStatusBadge(
  value: unknown,
  variantMap: Record<string, BadgeVariant>
): ReactNode {
  const status = value as string | null
  if (!status) {
    return <span className="text-muted-foreground">-</span>
  }
  return (
    <Badge
      variant={lookup(variantMap, status) ?? BadgeVariant.OUTLINE}
      className="text-xs capitalize"
    >
      {status.replaceAll('_', ' ')}
    </Badge>
  )
}

export function renderTimestamp(value: unknown): ReactNode {
  const ts = value as string | null
  if (!ts) {
    return <span className="text-muted-foreground">-</span>
  }
  return <span className="text-muted-foreground text-xs">{formatTimestamp(ts)}</span>
}

export function renderConfidenceBadge(value: unknown): ReactNode {
  const score = value as number | null
  if (score === null || score === undefined) {
    return <span className="text-muted-foreground">-</span>
  }
  const pct = Math.round(score * 100)
  let variant: BadgeVariant = BadgeVariant.DESTRUCTIVE
  if (pct >= 80) {
    variant = BadgeVariant.SUCCESS
  } else if (pct >= 50) {
    variant = BadgeVariant.WARNING
  }
  return (
    <Badge variant={variant} className="text-xs">
      {`${String(pct)}%`}
    </Badge>
  )
}

export function renderTruncatedText(value: unknown, maxLength = 80): ReactNode {
  const text = value as string | null
  if (!text) {
    return <span className="text-muted-foreground">-</span>
  }
  const truncated = text.length > maxLength ? `${text.substring(0, maxLength)}...` : text
  return (
    <span className="text-sm" title={text}>
      {truncated}
    </span>
  )
}
