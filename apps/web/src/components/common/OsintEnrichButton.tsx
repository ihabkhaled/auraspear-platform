'use client'

import { ChevronDown, Loader2, Search } from 'lucide-react'
import { OsintResultCard } from '@/components/common/OsintResultCard'
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui'
import { useOsintEnrichButton } from '@/hooks'
import { lookup } from '@/lib/utils'
import type { OsintEnrichButtonProps } from '@/types'

export function OsintEnrichButton({ iocType, iocValue, t }: OsintEnrichButtonProps) {
  const {
    handleEnrich,
    isEnriching,
    result,
    clearResult,
    fetchedAnalysisData,
    fetchingSourceId,
    fetchAnalysis,
  } = useOsintEnrichButton(iocType, iocValue)

  return (
    <div className="inline-flex flex-col gap-1">
      <Button
        variant="outline"
        size="sm"
        className="h-6 text-xs"
        onClick={handleEnrich}
        disabled={isEnriching}
      >
        {isEnriching ? (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        ) : (
          <Search className="mr-1 h-3 w-3" />
        )}
        {isEnriching ? t('enriching') : t('enrichOsint')}
      </Button>

      {result && result.results.length > 0 && (
        <Collapsible defaultOpen className="mt-1 w-full min-w-64">
          <CollapsibleTrigger className="text-muted-foreground flex items-center gap-1 text-xs hover:underline">
            <ChevronDown className="h-3 w-3" />
            {String(result.successCount)}/{String(result.totalSources)} {t('sourcesResponded')}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 max-h-80 space-y-1 overflow-y-auto">
            {result.results.map((r, i) => (
              <OsintResultCard
                key={`${r.sourceId}-${String(i)}`}
                result={r}
                t={t}
                fetchedData={lookup(fetchedAnalysisData, r.sourceId) as unknown}
                isFetchingAnalysis={fetchingSourceId === r.sourceId}
                onFetchAnalysis={fetchAnalysis}
              />
            ))}
            <Button variant="ghost" size="sm" className="h-5 text-[10px]" onClick={clearResult}>
              {t('osintDismiss')}
            </Button>
          </CollapsibleContent>
        </Collapsible>
      )}

      {result && result.results.length === 0 && (
        <p className="text-muted-foreground text-[10px]">{t('osintNoResults')}</p>
      )}
    </div>
  )
}
