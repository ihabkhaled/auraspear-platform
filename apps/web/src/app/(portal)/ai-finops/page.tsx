'use client'

import { PageHeader, LoadingSpinner, CollapsibleSection } from '@/components/common'
import {
  FinopsBudgetAlertsPanel,
  FinopsCostByFeatureTable,
  FinopsCostByModelTable,
  FinopsCostRatesPanel,
  FinopsDailyTrendChart,
  FinopsKpiCards,
} from '@/components/ai-finops'
import { useAiFinopsPage } from '@/hooks'

export default function AiFinopsPage() {
  const {
    t,
    canView,
    canManage,
    dashboard,
    isLoading,
    isFetching,
    formattedCost,
    formattedTokens,
    formattedRequests,
    formattedProjection,
    budgetLabel,
    budgetPct,
  } = useAiFinopsPage()

  if (!canView) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center">
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

      <FinopsKpiCards
        t={t}
        formattedCost={formattedCost}
        formattedTokens={formattedTokens}
        formattedRequests={formattedRequests}
        formattedProjection={formattedProjection}
        budgetLabel={budgetLabel}
        budgetPct={budgetPct}
      />

      <CollapsibleSection title={t('sections.dailyTrend')} defaultOpen>
        <FinopsDailyTrendChart
          t={t}
          data={Array.isArray(dashboard?.dailyTrend) ? dashboard.dailyTrend : []}
        />
      </CollapsibleSection>

      <CollapsibleSection title={t('sections.byFeature')} defaultOpen>
        <FinopsCostByFeatureTable
          t={t}
          data={Array.isArray(dashboard?.byFeature) ? dashboard.byFeature : []}
          loading={isFetching}
        />
      </CollapsibleSection>

      <CollapsibleSection title={t('sections.byModel')} defaultOpen>
        <FinopsCostByModelTable
          t={t}
          data={Array.isArray(dashboard?.byModel) ? dashboard.byModel : []}
          loading={isFetching}
        />
      </CollapsibleSection>

      <CollapsibleSection title={t('sections.budgetAlerts')} defaultOpen>
        <FinopsBudgetAlertsPanel />
      </CollapsibleSection>

      {canManage && (
        <CollapsibleSection title={t('sections.costRates')}>
          <FinopsCostRatesPanel />
        </CollapsibleSection>
      )}
    </div>
  )
}
