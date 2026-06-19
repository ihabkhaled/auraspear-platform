'use client'

import { LayoutDashboard, Search, RefreshCw, ExternalLink, Star, AlertCircle } from 'lucide-react'
import { PageHeader, LoadingSpinner, EmptyState, Pagination, DataTable } from '@/components/common'
import { Badge, Input } from '@/components/ui'
import { SortOrder } from '@/enums'
import { useExplorerDashboardsPage } from '@/hooks'
import { getErrorKey } from '@/lib/api-error'
import { formatDate } from '@/lib/utils'
import type { Column, GrafanaDashboard } from '@/types'

export default function ExplorerDashboardsPage() {
  const {
    t,
    tErrors,
    search,
    setSearch,
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
  } = useExplorerDashboardsPage()

  const columns: Column<GrafanaDashboard>[] = [
    {
      key: 'title',
      label: t('dashboards.title_column'),
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          {row.isStarred && <Star className="text-status-warning h-3.5 w-3.5 fill-current" />}
          <span className="font-medium">{String(value)}</span>
        </div>
      ),
    },
    {
      key: 'folderTitle',
      label: t('dashboards.folder'),
      sortable: true,
      render: value => (
        <span className="text-muted-foreground text-xs">{value ? String(value) : '—'}</span>
      ),
    },
    {
      key: 'tags',
      label: t('dashboards.tags'),
      render: value => {
        const tags = value as string[]
        if (tags.length === 0) return <span className="text-muted-foreground">—</span>
        return (
          <div className="flex flex-wrap gap-1">
            {tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )
      },
    },
    {
      key: 'url',
      label: t('dashboards.link'),
      render: value => (value ? <ExternalLink className="text-muted-foreground h-4 w-4" /> : null),
    },
    {
      key: 'syncedAt',
      label: t('dashboards.syncedAt'),
      sortable: true,
      defaultSortOrder: SortOrder.DESC,
      render: value => <span className="text-xs">{formatDate(value as string)}</span>,
    },
  ]

  if (error) {
    const errorKey = getErrorKey(error)
    return (
      <div className="space-y-6">
        <PageHeader title={t('dashboards.title')} description={t('dashboards.description')} />
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
        title={t('dashboards.title')}
        description={t('dashboards.description')}
        action={{
          label: syncMutation.isPending ? t('dashboards.syncing') : t('dashboards.sync'),
          icon: (
            <RefreshCw className={syncMutation.isPending ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          ),
          onClick: handleSync,
        }}
      />

      <div className="relative w-full sm:w-64">
        <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={e => setSearch(e.currentTarget.value)}
          placeholder={t('dashboards.searchPlaceholder')}
          className="ps-9"
        />
      </div>

      {(data?.data?.length ?? 0) === 0 && !isFetching ? (
        <EmptyState
          icon={<LayoutDashboard className="h-6 w-6" />}
          title={t('dashboards.noDashboards')}
          description={t('dashboards.noDashboardsDescription')}
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
