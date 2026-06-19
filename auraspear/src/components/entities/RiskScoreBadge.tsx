import { getRiskClasses } from '@/lib/entity.utils'
import { cn } from '@/lib/utils'
import type { RiskScoreBadgeProps } from '@/types'

export function RiskScoreBadge({ score }: RiskScoreBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums',
        getRiskClasses(score)
      )}
    >
      {String(Math.round(score))}
    </span>
  )
}
