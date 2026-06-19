'use client'

import { GitBranch, Search, RefreshCw, AlertCircle } from 'lucide-react'
import { PageHeader, LoadingSpinner, EmptyState, Pagination, DataTable } from '@/components/common'
import {
  Badge,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { SortOrder } from '@/enums'
import { useExplorerPipelinesPage } from '@/hooks'
import { getErrorKey } from '@/lib/api-error'
import { levelVariant } from '@/lib/explorer.utils'
import { formatDate } from '@/lib/utils'
import type { Column, LogstashPipelineLog } from '@/types'

export default function ExplorerPipelinesPage() {
  const {
    t,
    tErrors,
    search,
    setSearch,
    level,
    setLevel,
    sortBy,
    sortOrder,
    data,
    isLoading,
    isFetching,
    error,
    syncMutation,
    handleSync,
    handleSort,
    pagination,
  } = useExplorerPipelinesPage()

  const columns: Column<LogstashPipelineLog>[] = [
    {
      key: 'timestamp',
      label: t('pipelines.timestamp'),
      sortable: true,
      defaultSortOrder: SortOrder.DESC,
      render: value => <span className="text-xs">{formatDate(value as string)}</span>,
    },
    {
      key: 'pipelineId',
      label: t('pipelines.pipeline'),
      sortable: true,
      render: value => <span className="font-mono text-xs">{String(value)}</span>,
    },
    {
      key: 'level',
      label: t('pipelines.level'),
      sortable: true,
      render: value => (
        <Badge variant={levelVariant(String(value))}>{String(value).toUpperCase()}</Badge>
      ),
    },
    {
      key: 'message',
      label: t('pipelines.message'),
      className: 'max-w-sm truncate',
    },
    {
      key: 'source',
      label: t('pipelines.source'),
    },
    {
      key: 'eventsIn',
      label: t('pipelines.eventsIn'),
      render: value => <span className="font-mono text-xs">{String(value)}</span>,
    },
    {
      key: 'eventsOut',
      label: t('pipelines.eventsOut'),
      render: value => <span className="font-mono text-xs">{String(value)}</span>,
    },
  ]

  if (error) {
    const errorKey = getErrorKey(error)
    return (
      <div className="space-y-6">
        <PageHeader title={t('pipelines.title')} description={t('pipelines.description')} />
        <div className="bg-status-warning border-status-warning flex items-center gap-2 rounded-lg border p-4">
          <AlertCircle className="text-status-warning h-5 w-5 shrink-0" />
          <p className="text-status-warning text-sm font-medium">{tErrors(errorKey)}</p>
        </div>
      </div>
    )
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('pipelines.title')}
        description={t('pipelines.description')}
        action={{
          label: syncMutation.isPending ? t('pipelines.syncing') : t('pipelines.syncNow'),
          icon: <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />,
          onClick: handleSync,
        }}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-64">
          <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={e => setSearch(e.currentTarget.value)}
            placeholder={t('pipelines.searchPlaceholder')}
            className="ps-9"
          />
        </div>
        <Select value={level || 'all'} onValueChange={v => setLevel(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder={t('pipelines.allLevels')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('pipelines.allLevels')}</SelectItem>
            <SelectItem value="info">{t('pipelines.levelInfo')}</SelectItem>
            <SelectItem value="warn">{t('pipelines.levelWarn')}</SelectItem>
            <SelectItem value="error">{t('pipelines.levelError')}</SelectItem>
            <SelectItem value="debug">{t('pipelines.levelDebug')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(data?.data?.length ?? 0) === 0 && !isFetching ? (
        <EmptyState
          icon={<GitBranch className="h-6 w-6" />}
          title={t('pipelines.noLogs')}
          description={t('pipelines.noLogsDescription')}
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
