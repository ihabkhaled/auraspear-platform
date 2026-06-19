'use client'

import { Brain, Database, Percent, TrendingUp } from 'lucide-react'
import { CollapsibleSection, KpiCard, LoadingSpinner, PageHeader } from '@/components/common'
import { RagTracePanel } from '@/components/rag-observability'
import { useRagObservability } from '@/hooks'

export default function RagObservabilityPage() {
  const {
    t,
    canView,
    stats,
    isLoading,
    traceQuery,
    setTraceQuery,
    traceResult,
    handleTrace,
    isTracing,
  } = useRagObservability()

  if (!canView) {
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

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label={t('kpi.avgMemories')}
          value={String(stats?.avgMemoriesPerRetrieval ?? 0)}
          accentColor={undefined}
          icon={<Brain className="h-4 w-4" />}
        />
        <KpiCard
          label={t('kpi.avgSimilarity')}
          value={`${String(Math.round((stats?.avgSimilarityScore ?? 0) * 100))}%`}
          accentColor={undefined}
          icon={<Percent className="h-4 w-4" />}
        />
        <KpiCard
          label={t('kpi.categories')}
          value={String(stats?.topCategories?.length ?? 0)}
          accentColor={undefined}
          icon={<Database className="h-4 w-4" />}
        />
        <KpiCard
          label={t('kpi.retrievals24h')}
          value={String(stats?.totalRetrievals24h ?? 0)}
          accentColor={undefined}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      <CollapsibleSection title={t('sections.trace')} defaultOpen>
        <RagTracePanel
          t={t}
          traceQuery={traceQuery}
          setTraceQuery={setTraceQuery}
          traceResult={traceResult}
          onTrace={handleTrace}
          isTracing={isTracing}
        />
      </CollapsibleSection>
    </div>
  )
}
