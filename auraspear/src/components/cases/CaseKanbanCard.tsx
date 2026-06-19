'use client'

import { Link2, Clock } from 'lucide-react'
import { SeverityBadge } from '@/components/common'
import { Avatar, AvatarFallback } from '@/components/ui'
import { CaseStatus } from '@/enums'
import { useCaseKanbanCard } from '@/hooks'
import { getInitials } from '@/lib/case.utils'
import { CASE_SEVERITY_BORDER_COLORS } from '@/lib/constants/cases'
import { cn, formatRelativeTime, lookup } from '@/lib/utils'
import type { CaseKanbanCardProps } from '@/types'

export function CaseKanbanCard({ caseItem, onClick, currentUserId, isAdmin }: CaseKanbanCardProps) {
  const { t } = useCaseKanbanCard()
  const isClosed = caseItem.status === CaseStatus.CLOSED
  const isDimmed =
    currentUserId !== undefined && isAdmin === false && caseItem.ownerUserId !== currentUserId

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(caseItem)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.(caseItem)
        }
      }}
      className={cn(
        'group border-border bg-card hover:border-primary/50 relative cursor-pointer overflow-hidden rounded-lg border transition-all hover:-translate-y-0.5 hover:shadow-md',
        isClosed && 'opacity-60 grayscale',
        isDimmed && !isClosed && 'opacity-50'
      )}
    >
      <div
        className="absolute inset-y-0 start-0 w-1"
        style={{ backgroundColor: lookup(CASE_SEVERITY_BORDER_COLORS, caseItem.severity) }}
      />

      <div className="flex flex-col gap-2.5 p-3 ps-4">
        <div className="flex items-start justify-between gap-2">
          <span className="text-muted-foreground font-mono text-xs">{caseItem.caseNumber}</span>
          <SeverityBadge severity={caseItem.severity} />
        </div>

        <p className="line-clamp-2 text-sm leading-snug font-medium">{caseItem.title}</p>

        <span className="text-muted-foreground text-xs">{caseItem.tenantName}</span>

        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center gap-2">
            <Avatar size="sm">
              <AvatarFallback>
                {getInitials(caseItem.ownerName ?? caseItem.createdBy ?? '')}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-muted-foreground text-[10px]">{t('assignee')}:</span>
              <span className="text-xs">{caseItem.ownerName ?? t('unassigned')}</span>
            </div>
            <div className="border-border ms-2 border-s ps-2">
              <div className="flex flex-col">
                <span className="text-muted-foreground text-[10px]">{t('createdBy')}:</span>
                <span className="text-muted-foreground text-xs">
                  {caseItem.createdByName ?? caseItem.createdBy ?? '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="text-muted-foreground flex items-center gap-3 text-xs">
            {(caseItem.linkedAlerts?.length ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                {t('linkedAlerts', { count: caseItem.linkedAlerts?.length ?? 0 })}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(caseItem.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
