'use client'

import { PageHeader, LoadingSpinner } from '@/components/common'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import { useMsspDashboardPage } from '@/hooks'
import { cn } from '@/lib/utils'
import type { MsspTenantSummary } from '@/types'

function TenantCard({ summary, t }: { summary: MsspTenantSummary; t: (key: string) => string }) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{summary.tenantName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">{t('criticalAlerts')}</span>
          <Badge variant={summary.criticalAlerts > 0 ? 'destructive' : 'secondary'}>
            {String(summary.criticalAlerts)}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">{t('openCases')}</span>
          <span className="text-foreground text-sm font-medium">{String(summary.openCases)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">{t('connectorHealth')}</span>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
              summary.connectorHealth >= 80
                ? 'bg-status-success text-status-success'
                : 'bg-status-warning text-status-warning'
            )}
          >
            {`${String(summary.connectorHealth)}%`}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">{t('aiUsage')}</span>
          <span className="text-foreground text-sm font-medium">{String(summary.aiUsage)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function MsspDashboardPage() {
  const { t, portfolioData, portfolioLoading } = useMsspDashboardPage()

  const portfolio = portfolioData?.data as unknown as
    | {
        tenants?: MsspTenantSummary[]
        totalAlerts?: number
        totalCriticalAlerts?: number
        totalOpenCases?: number
      }
    | undefined

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />

      {portfolioLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Portfolio KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="border-border">
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-xs font-semibold uppercase">
                  {t('totalAlerts')}
                </p>
                <p className="text-foreground mt-1 text-2xl font-bold">
                  {String(portfolio?.totalAlerts ?? 0)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-xs font-semibold uppercase">
                  {t('criticalAlerts')}
                </p>
                <p className="text-status-error mt-1 text-2xl font-bold">
                  {String(portfolio?.totalCriticalAlerts ?? 0)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-xs font-semibold uppercase">
                  {t('openCases')}
                </p>
                <p className="text-foreground mt-1 text-2xl font-bold">
                  {String(portfolio?.totalOpenCases ?? 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tenant Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {portfolio?.tenants?.map(tenant => (
              <TenantCard key={tenant.tenantId} summary={tenant} t={t} />
            ))}
          </div>

          {(!portfolio?.tenants || portfolio.tenants.length === 0) && (
            <p className="text-muted-foreground py-8 text-center text-sm">{t('noTenants')}</p>
          )}
        </>
      )}
    </div>
  )
}
