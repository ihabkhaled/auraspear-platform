'use client'

import { FileText, ScrollText, Server } from 'lucide-react'
import {
  AppLogDetailDialog,
  AppLogTable,
  AuditLogTable,
  ServiceHealthGrid,
} from '@/components/admin'
import {
  PageHeader,
  Pagination,
  LoadingSpinner,
  ErrorMessage,
  EmptyState,
} from '@/components/common'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui'
import { AppLogLevel, AppLogFeature, ServiceStatus, SystemAdminTab } from '@/enums'
import { useSystemAdminPage } from '@/hooks'
import { ALL_LEVELS, ALL_FEATURES } from '@/lib/constants/admin'
import { computeHealthPercent, getHealthStatusClass, getHealthBgClass } from '@/lib/health-utils'
import { cn } from '@/lib/utils'
import type { ServiceHealth } from '@/types'

function HealthSummary({ services, t }: { services: ServiceHealth[]; t: (key: string) => string }) {
  const percent = computeHealthPercent(services)
  const online = services.filter(s => s.status === ServiceStatus.HEALTHY).length

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className={cn('h-2 w-2 rounded-full', getHealthBgClass(percent))} />
        <span className="text-muted-foreground text-xs">
          {t('services.online')}: {online}/{services.length}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Progress value={percent} className="h-1.5 w-24" />
        <span className={cn('text-xs font-bold', getHealthStatusClass(percent))}>{percent}%</span>
      </div>
    </div>
  )
}

export default function SystemAdminPage() {
  const {
    t,
    activeTab,
    setActiveTab,
    healthData,
    healthLoading,
    healthError,
    auditData,
    auditLoading,
    pagination,
    auditSortBy,
    auditSortOrder,
    handleAuditSort,
    appLogData,
    appLogFetching,
    appLogPagination,
    appLogSortBy,
    appLogSortOrder,
    handleAppLogSort,
    appLogSearch,
    setAppLogSearch,
    appLogLevel,
    setAppLogLevel,
    appLogFeature,
    setAppLogFeature,
    appLogActorEmail,
    setAppLogActorEmail,
    resetAppLogFilters,
    selectedLog,
    detailOpen,
    handleLogClick,
    handleDetailClose,
  } = useSystemAdminPage()

  function renderServices() {
    if (healthLoading) return <LoadingSpinner />
    if (healthError) return <ErrorMessage message={t('services.loadError')} />
    if ((healthData?.data?.length ?? 0) === 0) {
      return (
        <EmptyState
          icon={<Server className="h-6 w-6" />}
          title={t('services.noServices')}
          description={t('services.noServicesDescription')}
        />
      )
    }
    return <ServiceHealthGrid services={healthData?.data ?? []} />
  }

  function renderAuditLogs() {
    if (auditLoading) return <LoadingSpinner />
    if ((auditData?.data?.length ?? 0) === 0) {
      return (
        <EmptyState
          icon={<ScrollText className="h-6 w-6" />}
          title={t('audit.noLogs')}
          description={t('audit.noLogsDescription')}
        />
      )
    }
    return (
      <AuditLogTable
        logs={auditData?.data ?? []}
        loading={auditLoading}
        sortBy={auditSortBy}
        sortOrder={auditSortOrder}
        onSort={handleAuditSort}
      />
    )
  }

  function renderAppLogs() {
    if ((appLogData?.data?.length ?? 0) === 0 && !appLogFetching) {
      return (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title={t('appLogs.noLogs')}
          description={t('appLogs.noLogsDescription')}
        />
      )
    }
    return (
      <AppLogTable
        logs={appLogData?.data ?? []}
        loading={appLogFetching}
        sortBy={appLogSortBy}
        sortOrder={appLogSortOrder}
        onSort={handleAppLogSort}
        onRowClick={handleLogClick}
      />
    )
  }

  const hasActiveFilters = Boolean(appLogSearch || appLogLevel || appLogFeature || appLogActorEmail)

  return (
    <div className="space-y-6">
      <PageHeader title={t('system.title')} description={t('system.description')} />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">{t('services.title')}</CardTitle>
            {!healthLoading && (healthData?.data?.length ?? 0) > 0 && (
              <HealthSummary services={healthData?.data ?? []} t={t} />
            )}
          </div>
        </CardHeader>
        <CardContent>{renderServices()}</CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as SystemAdminTab)}>
            <TabsList>
              <TabsTrigger value={SystemAdminTab.AUDIT} className="cursor-pointer gap-1.5">
                <ScrollText className="h-4 w-4" />
                {t('audit.title')}
              </TabsTrigger>
              <TabsTrigger value={SystemAdminTab.APP_LOGS} className="cursor-pointer gap-1.5">
                <FileText className="h-4 w-4" />
                {t('appLogs.title')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={SystemAdminTab.AUDIT} className="space-y-4">
              {renderAuditLogs()}
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={pagination.setPage}
                total={pagination.total}
              />
            </TabsContent>

            <TabsContent value={SystemAdminTab.APP_LOGS} className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:flex md:flex-wrap md:items-center">
                <Input
                  placeholder={t('appLogs.searchPlaceholder')}
                  value={appLogSearch}
                  onChange={e => setAppLogSearch(e.currentTarget.value)}
                  className="w-full md:w-64"
                />
                <Select
                  value={appLogLevel || ALL_LEVELS}
                  onValueChange={v => setAppLogLevel(v === ALL_LEVELS ? '' : v)}
                >
                  <SelectTrigger className="w-full md:w-32">
                    <SelectValue placeholder={t('appLogs.level')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_LEVELS}>{t('appLogs.allLevels')}</SelectItem>
                    {Object.values(AppLogLevel).map(level => (
                      <SelectItem key={level} value={level}>
                        {level.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={appLogFeature || ALL_FEATURES}
                  onValueChange={v => setAppLogFeature(v === ALL_FEATURES ? '' : v)}
                >
                  <SelectTrigger className="w-full md:w-44">
                    <SelectValue placeholder={t('appLogs.feature')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_FEATURES}>{t('appLogs.allFeatures')}</SelectItem>
                    {Object.values(AppLogFeature).map(feature => (
                      <SelectItem key={feature} value={feature}>
                        {t(`appLogs.features.${feature}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder={t('appLogs.actorEmailPlaceholder')}
                  value={appLogActorEmail}
                  onChange={e => setAppLogActorEmail(e.currentTarget.value)}
                  className="w-full md:w-56"
                />
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetAppLogFilters}
                    className="w-full md:w-auto"
                  >
                    {t('appLogs.clearFilters')}
                  </Button>
                )}
              </div>

              {renderAppLogs()}

              <Pagination
                page={appLogPagination.page}
                totalPages={appLogPagination.totalPages}
                onPageChange={appLogPagination.setPage}
                total={appLogPagination.total}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AppLogDetailDialog log={selectedLog} open={detailOpen} onClose={handleDetailClose} />
    </div>
  )
}
