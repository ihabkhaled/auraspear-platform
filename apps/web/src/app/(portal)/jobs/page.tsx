'use client'

import { Clock3, RefreshCcw, XCircle } from 'lucide-react'
import { DataTable, EmptyState, LoadingSpinner, PageHeader, Pagination } from '@/components/common'
import { JobFilters, JobKpiCards } from '@/components/jobs'
import { Badge, Button } from '@/components/ui'
import { useJobsPage } from '@/hooks'
import { formatTimestamp } from '@/lib/dayjs'
import {
  getJobStatusBadgeVariant,
  isCancellableJobStatus,
  isRetryableJobStatus,
} from '@/lib/job.utils'
import type { Column, JobRecord } from '@/types'

export default function JobsPage() {
  const {
    t,
    allFilterValue,
    pagination,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    data,
    stats,
    isLoading,
    isFetching,
    isMutating,
    canManage,
    canCancelAll,
    sortBy,
    sortOrder,
    handleSort,
    handleRetry,
    handleCancel,
    handleCancelAll,
    isJobStatus,
    isJobType,
  } = useJobsPage()

  const columns: Column<JobRecord>[] = [
    {
      key: 'type',
      label: t('columns.type'),
      sortable: true,
      render: value => (
        <Badge variant="outline" className="uppercase">
          {String(value).replaceAll('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: t('columns.status'),
      sortable: true,
      render: value => (
        <Badge variant={getJobStatusBadgeVariant(value as JobRecord['status'])}>
          {String(value)}
        </Badge>
      ),
    },
    {
      key: 'attempts',
      label: t('columns.attempts'),
      sortable: true,
      render: (value, row) => (
        <span className="font-mono text-xs">{`${String(value)} / ${row.maxAttempts}`}</span>
      ),
    },
    {
      key: 'createdBy',
      label: t('columns.createdBy'),
      sortable: true,
      render: value => <span className="text-xs">{String(value ?? '—')}</span>,
    },
    {
      key: 'createdAt',
      label: t('columns.createdAt'),
      sortable: true,
      render: value => (
        <span className="text-muted-foreground text-xs">
          {formatTimestamp(String(value))}
        </span>
      ),
    },
    {
      key: 'scheduledAt',
      label: t('columns.scheduledAt'),
      sortable: true,
      render: value => (
        <span className="text-muted-foreground text-xs">
          {value ? formatTimestamp(String(value)) : '—'}
        </span>
      ),
    },
    {
      key: 'error',
      label: t('columns.error'),
      className: 'max-w-[240px]',
      render: value =>
        value ? <span className="text-status-error text-xs">{String(value)}</span> : <span>—</span>,
    },
    {
      key: 'actions',
      label: t('columns.actions'),
      className: 'w-36',
      render: (_value, row) =>
        canManage ? (
          <div className="flex items-center gap-2">
            {isRetryableJobStatus(row.status) ? (
              <Button
                variant="outline"
                size="sm"
                disabled={isMutating}
                onClick={() => handleRetry(row.id)}
                className="gap-1.5"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                {t('retry')}
              </Button>
            ) : null}
            {isCancellableJobStatus(row.status) ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={isMutating}
                onClick={() => handleCancel(row.id)}
                className="gap-1.5"
              >
                <XCircle className="h-3.5 w-3.5" />
                {t('cancel')}
              </Button>
            ) : null}
          </div>
        ) : null,
    },
  ]

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />

      <JobKpiCards stats={stats} t={t} />

      <JobFilters
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        allFilterValue={allFilterValue}
        isMutating={isMutating}
        canCancelAll={canCancelAll}
        onStatusChange={setStatusFilter}
        onTypeChange={setTypeFilter}
        onCancelAll={handleCancelAll}
        isJobStatus={isJobStatus}
        isJobType={isJobType}
        t={t}
      />

      {(data?.data?.length ?? 0) === 0 && !isFetching ? (
        <EmptyState
          icon={<Clock3 className="h-6 w-6" />}
          title={t('emptyTitle')}
          description={t('emptyDescription')}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            loading={isFetching}
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
        </>
      )}
    </div>
  )
}
