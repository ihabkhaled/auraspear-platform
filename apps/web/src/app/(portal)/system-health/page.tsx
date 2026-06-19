'use client'

import { Search } from 'lucide-react'
import { DataTable, PageHeader, Pagination } from '@/components/common'
import { SystemHealthDetailPanel } from '@/components/system-health/SystemHealthDetailPanel'
import { SystemHealthFilters } from '@/components/system-health/SystemHealthFilters'
import { SystemHealthKpiCards } from '@/components/system-health/SystemHealthKpiCards'
import { useSystemHealthPage } from '@/hooks'
import {
  HEALTH_CHECK_STATUS_CLASSES,
  HEALTH_CHECK_STATUS_LABEL_KEYS,
  SERVICE_TYPE_LABEL_KEYS,
} from '@/lib/constants/system-health'
import { cn, lookup } from '@/lib/utils'

export default function SystemHealthPage() {
  const {
    t,
    data,
    stats,
    statsLoading,
    latestChecks,
    columns,
    isFetching,
    pagination,
    serviceTypeFilter,
    statusFilter,
    sortBy,
    sortOrder,
    detailOpen,
    setDetailOpen,
    selectedCheck,
    detailMetrics,
    handleServiceTypeChange,
    handleStatusChange,
    handleSort,
  } = useSystemHealthPage()

  return (
    <div className="space-y-4">
      <PageHeader title={t('title')} description={t('description')} />

      <SystemHealthKpiCards stats={stats} isLoading={statsLoading} />

      {latestChecks.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {latestChecks.map(check => {
            const statusLabelKey = lookup(HEALTH_CHECK_STATUS_LABEL_KEYS, check.status)
            const serviceLabelKey = lookup(SERVICE_TYPE_LABEL_KEYS, check.serviceType)
            return (
              <div
                key={check.id}
                className="bg-card border-border flex items-center gap-2 rounded-lg border p-3"
              >
                <span
                  className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                    lookup(HEALTH_CHECK_STATUS_CLASSES, check.status)
                  )}
                >
                  {statusLabelKey ? t(statusLabelKey) : check.status}
                </span>
                <span className="text-foreground text-sm font-medium">
                  {serviceLabelKey ? t(serviceLabelKey) : check.serviceType}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <SystemHealthFilters
        serviceTypeFilter={serviceTypeFilter}
        statusFilter={statusFilter}
        onServiceTypeChange={handleServiceTypeChange}
        onStatusChange={handleStatusChange}
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isFetching}
        emptyMessage={t('noChecks')}
        emptyIcon={<Search className="h-6 w-6" />}
        emptyDescription={t('emptyDescription')}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
      />

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={pagination.setPage}
        total={pagination.total}
      />

      <SystemHealthDetailPanel
        healthCheck={selectedCheck}
        metrics={detailMetrics}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  )
}
