'use client'

import { Badge, ScrollArea } from '@/components/ui'
import { useCaseKanbanBoard } from '@/hooks'
import { KANBAN_COLUMN_CONFIG } from '@/lib/constants/cases'
import { cn } from '@/lib/utils'
import type { CaseKanbanBoardProps } from '@/types'
import { CaseKanbanCard } from './CaseKanbanCard'

export function CaseKanbanBoard({
  cases,
  onCaseClick,
  currentUserId,
  isAdmin,
}: CaseKanbanBoardProps) {
  const { t, groupedCases } = useCaseKanbanBoard(cases)

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {KANBAN_COLUMN_CONFIG.map(column => {
        const columnCases = groupedCases[column.status] ?? []

        return (
          <div key={column.status} className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-1">
              <span className="relative flex h-2.5 w-2.5">
                {column.animate && (
                  <span
                    className={cn(
                      'absolute inline-flex h-full w-full animate-pulse rounded-full opacity-75',
                      column.dotClass
                    )}
                  />
                )}
                <span
                  className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', column.dotClass)}
                />
              </span>
              <h3 className="text-sm font-semibold">{t(column.labelKey)}</h3>
              <Badge variant="secondary" className="text-xs">
                {columnCases.length}
              </Badge>
            </div>

            <ScrollArea className="h-[calc(100vh-280px)] sm:h-[calc(100vh-220px)]">
              <div className="border-border/60 flex flex-col gap-3 rounded-lg border border-dashed p-3">
                {columnCases.length === 0 && (
                  <p className="text-muted-foreground py-8 text-center text-xs">{t('noItems')}</p>
                )}
                {columnCases.map(caseItem => (
                  <CaseKanbanCard
                    key={caseItem.id}
                    caseItem={caseItem}
                    onClick={onCaseClick}
                    currentUserId={currentUserId}
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        )
      })}
    </div>
  )
}
