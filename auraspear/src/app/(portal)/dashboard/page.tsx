'use client'

import { Shield, BarChart3 } from 'lucide-react'
import { AlertTrendChart, SeverityDistributionChart } from '@/components/charts'
import { PageHeader, KpiCard, LoadingSpinner, EmptyState } from '@/components/common'
import {
  AiDashboardInsight,
  AiOperationsCanvas,
  DashboardMetricBarList,
  DashboardSectionCard,
  DashboardNarrativeList,
  MitreTopTechniques,
  TopTargetedAssets,
  PipelineHealthBar,
  RecentActivityFeed,
} from '@/components/dashboard'
import { Button, Card, CardContent } from '@/components/ui'
import { DashboardPanelKey } from '@/enums'
import { useDashboardPage } from '@/hooks'
import {
  KPI_ICONS,
  KPI_COLORS,
  KPI_ROUTES,
  EXTENDED_KPI_ICONS,
  EXTENDED_KPI_COLORS,
} from '@/lib/constants/dashboard'
import { getDashboardCardGridClass } from '@/lib/dashboard.utils'
import { cn, lookup } from '@/lib/utils'

export default function DashboardPage() {
  const {
    t,
    kpis,
    kpisLoading,
    trends,
    trendsLoading,
    severityDistribution,
    severityLoading,
    mitre,
    mitreLoading,
    assets,
    assetsLoading,
    healthLoading,
    healthServices,
    healthPercent,
    handleServiceClick,
    canAccessRoute,
    canViewAlertAnalytics,
    canViewPipelineHealth,
    navigateToRoute,
    extendedKPIItems,
    extendedKPIsLoading,
    analyticsOverview,
    analyticsOverviewLoading,
    operationsOverview,
    operationsOverviewLoading,
    overviewItems,
    threatOperationItems,
    incidentStatusItems,
    caseAgingItems,
    topRuleItems,
    noisyRuleItems,
    connectorSyncItems,
    connectorFailureItems,
    runtimeBacklogItems,
    automationQualityItems,
    exposureSummaryItems,
    governanceItems,
    automationItems,
    infrastructureItems,
    densityOptions,
    densityLabelKeys,
    panelDensity,
    panelGapClass,
    panelStackClass,
    handleDensityChange,
    isPanelOpen,
    handlePanelOpenChange,
    isUpdatingPreferences,
    dailySummary,
    isDailySummaryLoading,
    generateDailySummary,
    aiTCommon,
  } = useDashboardPage()

  function renderKPIs() {
    if (kpisLoading) return <LoadingSpinner />
    if ((kpis?.data?.length ?? 0) === 0) {
      return (
        <div className="col-span-full">
          <EmptyState
            icon={<BarChart3 className="h-6 w-6" />}
            title={t('emptyTitle')}
            description={t('emptyDescription')}
          />
        </div>
      )
    }
    return kpis?.data?.map((kpi, i) => {
      const route = Reflect.get(KPI_ROUTES, kpi.label) as string | undefined
      if (route && !canAccessRoute(route)) {
        return null
      }
      return (
        <KpiCard
          key={kpi.label}
          label={t(kpi.label)}
          value={kpi.value}
          trend={kpi.trend}
          trendLabel={t(kpi.trendLabel)}
          icon={KPI_ICONS.at(i) ?? KPI_ICONS.at(0) ?? <Shield className="h-5 w-5" />}
          accentColor={KPI_COLORS.at(i)}
          onClick={route ? () => navigateToRoute(route) : undefined}
        />
      )
    })
  }

  function renderExtendedKPIs() {
    if (extendedKPIsLoading) return <LoadingSpinner />
    if (!extendedKPIItems.some(item => canAccessRoute(item.route))) return null

    return extendedKPIItems.map((item, i) => {
      if (!canAccessRoute(item.route)) {
        return null
      }
      const icon = EXTENDED_KPI_ICONS.at(i) ?? EXTENDED_KPI_ICONS.at(0)
      const color = EXTENDED_KPI_COLORS.at(i)
      return (
        <Card
          key={item.labelKey}
          className="hover:bg-muted/50 cursor-pointer transition-colors"
          onClick={() => navigateToRoute(item.route)}
        >
          <CardContent className="flex items-center gap-3 py-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{
                backgroundColor: color
                  ? `color-mix(in srgb, ${color} 12%, transparent)`
                  : undefined,
                color,
              }}
            >
              {icon}
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground truncate text-xs">{t(item.labelKey)}</p>
              <p className="text-lg font-bold tracking-tight">{item.value}</p>
            </div>
          </CardContent>
        </Card>
      )
    })
  }

  const visibleKpiCount =
    kpis?.data?.filter(kpi => {
      const route = Reflect.get(KPI_ROUTES, kpi.label) as string | undefined
      return !route || canAccessRoute(route)
    }).length ?? 0

  const visibleExtendedKpiCount = extendedKPIItems.filter(item => canAccessRoute(item.route)).length

  return (
    <div className={panelStackClass}>
      <PageHeader title={t('title')} description={t('description')}>
        <div className="flex items-center gap-2">
          {densityOptions.map(option => (
            <Button
              key={option}
              variant={panelDensity === option ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleDensityChange(option)}
              disabled={isUpdatingPreferences}
            >
              {t(lookup(densityLabelKeys, option))}
            </Button>
          ))}
        </div>
      </PageHeader>

      <div className={cn('grid', panelGapClass, getDashboardCardGridClass(visibleKpiCount))}>
        {renderKPIs()}
      </div>

      {visibleExtendedKpiCount > 0 ? (
        <div
          className={cn('grid', panelGapClass, getDashboardCardGridClass(visibleExtendedKpiCount))}
        >
          {renderExtendedKPIs()}
        </div>
      ) : null}

      <AiDashboardInsight
        t={t}
        dailySummary={dailySummary}
        isDailySummaryLoading={isDailySummaryLoading}
        onGenerateSummary={generateDailySummary}
        tCommon={aiTCommon}
      />

      <DashboardSectionCard
        title={t('overviewSection')}
        open={isPanelOpen(DashboardPanelKey.OVERVIEW)}
        onOpenChange={open => handlePanelOpenChange(DashboardPanelKey.OVERVIEW, open)}
      >
        {analyticsOverviewLoading ? (
          <LoadingSpinner />
        ) : (
          <DashboardNarrativeList items={overviewItems} t={t} />
        )}
      </DashboardSectionCard>

      {canViewAlertAnalytics ? (
        <DashboardSectionCard
          title={t('threatOperationsSection')}
          open={isPanelOpen(DashboardPanelKey.THREAT_OPERATIONS)}
          onOpenChange={open => handlePanelOpenChange(DashboardPanelKey.THREAT_OPERATIONS, open)}
        >
          <div className={panelStackClass}>
            {analyticsOverviewLoading ? (
              <LoadingSpinner />
            ) : (
              <DashboardNarrativeList items={threatOperationItems} t={t} />
            )}

            <div className={cn('grid grid-cols-1 lg:grid-cols-[1.5fr_0.9fr]', panelGapClass)}>
              <DashboardSectionCard
                title={t('alertTrends')}
                action={<span className="text-muted-foreground text-xs">{t('last7Days')}</span>}
                open={isPanelOpen(DashboardPanelKey.ALERT_TRENDS)}
                onOpenChange={open => handlePanelOpenChange(DashboardPanelKey.ALERT_TRENDS, open)}
              >
                {trendsLoading ? <LoadingSpinner /> : <AlertTrendChart data={trends?.data ?? []} />}
              </DashboardSectionCard>

              <DashboardSectionCard
                title={t('severityDistribution')}
                open={isPanelOpen(DashboardPanelKey.SEVERITY_DISTRIBUTION)}
                onOpenChange={open =>
                  handlePanelOpenChange(DashboardPanelKey.SEVERITY_DISTRIBUTION, open)
                }
              >
                {severityLoading ? (
                  <LoadingSpinner />
                ) : (
                  <SeverityDistributionChart data={severityDistribution?.data ?? []} />
                )}
              </DashboardSectionCard>
            </div>

            <div className={cn('grid grid-cols-1 lg:grid-cols-2', panelGapClass)}>
              <DashboardSectionCard
                title={t('mitreTopTechniques')}
                open={isPanelOpen(DashboardPanelKey.MITRE_TECHNIQUES)}
                onOpenChange={open =>
                  handlePanelOpenChange(DashboardPanelKey.MITRE_TECHNIQUES, open)
                }
              >
                {mitreLoading ? (
                  <LoadingSpinner />
                ) : (
                  <MitreTopTechniques techniques={mitre?.data ?? []} />
                )}
              </DashboardSectionCard>

              <DashboardSectionCard
                title={t('topTargetedAssets')}
                open={isPanelOpen(DashboardPanelKey.TARGETED_ASSETS)}
                onOpenChange={open =>
                  handlePanelOpenChange(DashboardPanelKey.TARGETED_ASSETS, open)
                }
              >
                {assetsLoading ? (
                  <LoadingSpinner />
                ) : (
                  <TopTargetedAssets assets={assets?.data ?? []} />
                )}
              </DashboardSectionCard>
            </div>
          </div>
        </DashboardSectionCard>
      ) : null}

      {operationsOverview ? (
        <DashboardSectionCard
          title={t('operationsSection')}
          open={isPanelOpen(DashboardPanelKey.OPERATIONS)}
          onOpenChange={open => handlePanelOpenChange(DashboardPanelKey.OPERATIONS, open)}
        >
          <div className={cn('grid grid-cols-1 lg:grid-cols-2', panelGapClass)}>
            <DashboardSectionCard
              title={t('incidentStatusSection')}
              open={isPanelOpen(DashboardPanelKey.INCIDENT_STATUS)}
              onOpenChange={open => handlePanelOpenChange(DashboardPanelKey.INCIDENT_STATUS, open)}
            >
              {operationsOverviewLoading ? (
                <LoadingSpinner />
              ) : (
                <DashboardMetricBarList
                  items={incidentStatusItems}
                  emptyTitle={t('emptyTitle')}
                  emptyDescription={t('emptyDescription')}
                />
              )}
            </DashboardSectionCard>

            <DashboardSectionCard
              title={t('caseAgingSection')}
              open={isPanelOpen(DashboardPanelKey.CASE_AGING)}
              onOpenChange={open => handlePanelOpenChange(DashboardPanelKey.CASE_AGING, open)}
            >
              {operationsOverviewLoading ? (
                <LoadingSpinner />
              ) : (
                <DashboardNarrativeList items={caseAgingItems} t={t} />
              )}
            </DashboardSectionCard>

            <DashboardSectionCard
              title={t('rulePerformanceSection')}
              action={
                <span className="text-muted-foreground text-xs">
                  {t('activeRules')}: {operationsOverview.rulePerformance.activeRules}
                </span>
              }
              open={isPanelOpen(DashboardPanelKey.RULE_PERFORMANCE)}
              onOpenChange={open => handlePanelOpenChange(DashboardPanelKey.RULE_PERFORMANCE, open)}
            >
              {operationsOverviewLoading ? (
                <LoadingSpinner />
              ) : (
                <div className={panelStackClass}>
                  <div className="space-y-3">
                    <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                      {t('topRulesSection')}
                    </p>
                    <DashboardMetricBarList
                      items={topRuleItems}
                      emptyTitle={t('emptyTitle')}
                      emptyDescription={t('emptyDescription')}
                      hitCountLabel={t('hitCount')}
                      falsePositiveCountLabel={t('falsePositiveCount')}
                      falsePositiveRateLabel={t('falsePositiveRate')}
                      createdAtLabel={t('createdAt')}
                      lastTriggeredAtLabel={t('lastTriggeredAt')}
                    />
                  </div>
                  <div className="space-y-3">
                    <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                      {t('noisyRulesSection')}
                    </p>
                    <DashboardMetricBarList
                      items={noisyRuleItems}
                      emptyTitle={t('emptyTitle')}
                      emptyDescription={t('emptyDescription')}
                      hitCountLabel={t('hitCount')}
                      falsePositiveCountLabel={t('falsePositiveCount')}
                      falsePositiveRateLabel={t('falsePositiveRate')}
                      createdAtLabel={t('createdAt')}
                      lastTriggeredAtLabel={t('lastTriggeredAt')}
                    />
                  </div>
                </div>
              )}
            </DashboardSectionCard>

            <DashboardSectionCard
              title={t('connectorSyncSection')}
              open={isPanelOpen(DashboardPanelKey.CONNECTOR_SYNC)}
              onOpenChange={open => handlePanelOpenChange(DashboardPanelKey.CONNECTOR_SYNC, open)}
            >
              {operationsOverviewLoading ? (
                <LoadingSpinner />
              ) : (
                <div className={panelStackClass}>
                  <DashboardNarrativeList items={connectorSyncItems} t={t} />
                  <DashboardMetricBarList
                    items={connectorFailureItems}
                    emptyTitle={t('emptyTitle')}
                    emptyDescription={t('emptyDescription')}
                  />
                </div>
              )}
            </DashboardSectionCard>

            <DashboardSectionCard
              title={t('runtimeBacklogSection')}
              open={isPanelOpen(DashboardPanelKey.RUNTIME_BACKLOG)}
              onOpenChange={open => handlePanelOpenChange(DashboardPanelKey.RUNTIME_BACKLOG, open)}
            >
              {operationsOverviewLoading ? (
                <LoadingSpinner />
              ) : (
                <DashboardNarrativeList items={runtimeBacklogItems} t={t} />
              )}
            </DashboardSectionCard>

            <DashboardSectionCard
              title={t('automationQualitySection')}
              open={isPanelOpen(DashboardPanelKey.AUTOMATION_QUALITY)}
              onOpenChange={open =>
                handlePanelOpenChange(DashboardPanelKey.AUTOMATION_QUALITY, open)
              }
            >
              {operationsOverviewLoading ? (
                <LoadingSpinner />
              ) : (
                <DashboardNarrativeList items={automationQualityItems} t={t} />
              )}
            </DashboardSectionCard>

            <DashboardSectionCard
              title={t('exposureSummarySection')}
              open={isPanelOpen(DashboardPanelKey.EXPOSURE_SUMMARY)}
              onOpenChange={open => handlePanelOpenChange(DashboardPanelKey.EXPOSURE_SUMMARY, open)}
            >
              {operationsOverviewLoading ? (
                <LoadingSpinner />
              ) : (
                <DashboardNarrativeList items={exposureSummaryItems} t={t} />
              )}
            </DashboardSectionCard>
          </div>
        </DashboardSectionCard>
      ) : null}

      {analyticsOverview ? (
        <DashboardSectionCard
          title={t('automationSection')}
          open={isPanelOpen(DashboardPanelKey.AUTOMATION)}
          onOpenChange={open => handlePanelOpenChange(DashboardPanelKey.AUTOMATION, open)}
        >
          <div className={cn('grid grid-cols-1 lg:grid-cols-[1.3fr_0.9fr]', panelGapClass)}>
            <DashboardSectionCard
              title={t('aiOrchestrationCanvas')}
              open={isPanelOpen(DashboardPanelKey.AI_CANVAS)}
              onOpenChange={open => handlePanelOpenChange(DashboardPanelKey.AI_CANVAS, open)}
            >
              <AiOperationsCanvas automation={analyticsOverview.automation} t={t} />
            </DashboardSectionCard>
            <DashboardNarrativeList items={automationItems} t={t} />
          </div>
        </DashboardSectionCard>
      ) : null}

      <DashboardSectionCard
        title={t('governanceSection')}
        open={isPanelOpen(DashboardPanelKey.GOVERNANCE)}
        onOpenChange={open => handlePanelOpenChange(DashboardPanelKey.GOVERNANCE, open)}
      >
        {analyticsOverviewLoading ? (
          <LoadingSpinner />
        ) : (
          <DashboardNarrativeList items={governanceItems} t={t} />
        )}
      </DashboardSectionCard>

      <DashboardSectionCard
        title={t('infrastructureSection')}
        open={isPanelOpen(DashboardPanelKey.INFRASTRUCTURE)}
        onOpenChange={open => handlePanelOpenChange(DashboardPanelKey.INFRASTRUCTURE, open)}
      >
        <div className={panelStackClass}>
          {analyticsOverviewLoading ? (
            <LoadingSpinner />
          ) : (
            <DashboardNarrativeList items={infrastructureItems} t={t} />
          )}

          <div className={cn('grid grid-cols-1 lg:grid-cols-2', panelGapClass)}>
            <DashboardSectionCard
              title={t('recentActivity')}
              open={isPanelOpen(DashboardPanelKey.RECENT_ACTIVITY)}
              onOpenChange={open => handlePanelOpenChange(DashboardPanelKey.RECENT_ACTIVITY, open)}
            >
              <RecentActivityFeed />
            </DashboardSectionCard>

            {canViewPipelineHealth ? (
              <DashboardSectionCard
                title={t('pipelineHealth')}
                action={
                  <span className="text-muted-foreground text-xs">
                    {t('systemHealth')}: {healthPercent}%
                  </span>
                }
              >
                {healthLoading ? (
                  <LoadingSpinner />
                ) : (
                  <PipelineHealthBar
                    services={healthServices}
                    onServiceClick={handleServiceClick}
                  />
                )}
              </DashboardSectionCard>
            ) : null}
          </div>
        </div>
      </DashboardSectionCard>
    </div>
  )
}
