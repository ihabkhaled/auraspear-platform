'use client'

import { Clock } from 'lucide-react'
import { PageHeader, LoadingSpinner, EmptyState, Pagination, DataTable } from '@/components/common'
import { Badge } from '@/components/ui'
import { SortOrder } from '@/enums'
import { useExplorerSyncJobsPage } from '@/hooks'
import { statusVariant } from '@/lib/explorer.utils'
import { formatDate } from '@/lib/utils'
import type { Column, SyncJob } from '@/types'

export default function ExplorerSyncJobsPage() {
  const { t, sortOrder, data, isLoading, isFetching, handleSort, pagination } =
    useExplorerSyncJobsPage()

  const columns: Column<SyncJob>[] = [
    {
      key: 'connectorType',
      label: t('syncJobs.connector'),
      render: value => (
        <Badge variant="outline" className="uppercase">
          {String(value)}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: t('syncJobs.status'),
      render: value => <Badge variant={statusVariant(String(value))}>{String(value)}</Badge>,
    },
    { key: 'recordsSynced', label: t('syncJobs.synced') },
    { key: 'recordsFailed', label: t('syncJobs.failed') },
    {
      key: 'durationMs',
      label: t('syncJobs.duration'),
      render: value => {
        if (value === null || value === undefined) {
          return <span className="text-muted-foreground">—</span>
        }
        const ms = Number(value)
        return (
          <span className="text-xs">{ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`}</span>
        )
      },
    },
    { key: 'initiatedBy', label: t('syncJobs.initiatedBy') },
    {
      key: 'startedAt',
      label: t('syncJobs.startedAt'),
      sortable: true,
      defaultSortOrder: SortOrder.DESC,
      render: value => <span className="text-xs">{formatDate(value as string)}</span>,
    },
    {
      key: 'errorMessage',
      label: t('syncJobs.error'),
      className: 'max-w-xs truncate',
      render: value =>
        value ? (
          <span className="text-status-error text-xs">{String(value)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ]

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <PageHeader title={t('syncJobs.title')} description={t('syncJobs.description')} />

      {(data?.data?.length ?? 0) === 0 && !isFetching ? (
        <EmptyState
          icon={<Clock className="h-6 w-6" />}
          title={t('syncJobs.noJobs')}
          description={t('syncJobs.noJobsDescription')}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            loading={isFetching}
            sortOrder={sortOrder}
            onSort={handleSort}
          />
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={pagination.setPage}
            total={pagination.total}
          />
        </>
      )}
    </div>
  )
}
