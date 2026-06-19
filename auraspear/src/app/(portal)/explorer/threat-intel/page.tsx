'use client'

import { Shield, Search, AlertCircle } from 'lucide-react'
import { PageHeader, LoadingSpinner, EmptyState, Pagination, DataTable } from '@/components/common'
import { Input } from '@/components/ui'
import { SortOrder } from '@/enums'
import { useExplorerThreatIntelPage } from '@/hooks'
import { getErrorKey } from '@/lib/api-error'
import type { Column, MispEventRow } from '@/types'

export default function ExplorerThreatIntelPage() {
  const {
    t,
    tErrors,
    search,
    setSearch,
    sortOrder,
    data,
    isLoading,
    isFetching,
    error,
    handleSort,
    pagination,
  } = useExplorerThreatIntelPage()

  const columns: Column<MispEventRow>[] = [
    {
      key: 'id',
      label: t('threatIntel.eventId'),
    },
    {
      key: 'info',
      label: t('threatIntel.info'),
      className: 'max-w-sm truncate',
    },
    {
      key: 'date',
      label: t('threatIntel.date'),
      sortable: true,
      defaultSortOrder: SortOrder.DESC,
    },
    {
      key: 'threat_level_id',
      label: t('threatIntel.threatLevel'),
    },
    {
      key: 'Orgc',
      label: t('threatIntel.org'),
      render: value => {
        const org = value as MispEventRow['Orgc']
        return <span>{org?.name ?? '—'}</span>
      },
    },
    {
      key: 'attribute_count',
      label: t('threatIntel.attributes'),
    },
  ]

  if (error) {
    const errorKey = getErrorKey(error)
    return (
      <div className="space-y-6">
        <PageHeader title={t('threatIntel.title')} description={t('threatIntel.description')} />
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
      <PageHeader title={t('threatIntel.title')} description={t('threatIntel.description')} />

      <div className="relative w-full sm:w-64">
        <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={e => setSearch(e.currentTarget.value)}
          placeholder={t('threatIntel.searchPlaceholder')}
          className="ps-9"
        />
      </div>

      {(data?.data?.length ?? 0) === 0 && !isFetching ? (
        <EmptyState
          icon={<Shield className="h-6 w-6" />}
          title={t('threatIntel.noEvents')}
          description={t('threatIntel.noEventsDescription')}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={(data?.data ?? []) as MispEventRow[]}
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
