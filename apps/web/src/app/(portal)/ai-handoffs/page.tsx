'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CollapsibleSection, LoadingSpinner, PageHeader } from '@/components/common'
import { HandoffHistoryTable, HandoffKpis } from '@/components/ai-handoffs'
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import { useAiHandoffs } from '@/hooks'

export default function AiHandoffsPage() {
  const {
    t,
    canPromote,
    stats,
    history,
    totalHistory,
    isLoading,
    isFetchingHistory,
    page,
    limit,
    targetFilter,
    setPage,
    setTargetFilter,
  } = useAiHandoffs()

  if (!canPromote) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        {t('noAccess')}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const totalPages = Math.ceil(totalHistory / limit)

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />

      <HandoffKpis t={t} stats={stats} />

      <CollapsibleSection title={t('sections.history')} defaultOpen>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Select
              value={targetFilter || 'all'}
              onValueChange={v => setTargetFilter(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder={t('allTargets')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allTargets')}</SelectItem>
                <SelectItem value="case">{t('targetCase')}</SelectItem>
                <SelectItem value="incident">{t('targetIncident')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <HandoffHistoryTable t={t} data={history} loading={isFetchingHistory} />

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-muted-foreground text-sm">
                {String(page)} / {String(totalPages)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CollapsibleSection>
    </div>
  )
}
