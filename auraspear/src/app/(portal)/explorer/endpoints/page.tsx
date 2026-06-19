'use client'

import { Monitor, Search, RefreshCw, AlertCircle } from 'lucide-react'
import { PageHeader, LoadingSpinner, EmptyState, Pagination, DataTable } from '@/components/common'
import {
  Badge,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui'
import { SortOrder, VelociraptorTab } from '@/enums'
import { useExplorerEndpointsPage } from '@/hooks'
import { getErrorKey } from '@/lib/api-error'
import { formatDate } from '@/lib/utils'
import type { Column, VelociraptorEndpoint, VelociraptorHunt } from '@/types'

export default function ExplorerEndpointsPage() {
  const {
    t,
    tErrors,
    activeTab,
    setActiveTab,
    endpointSearch,
    setEndpointSearch,
    endpointSortBy,
    endpointSortOrder,
    endpointsData,
    endpointsLoading,
    endpointsFetching,
    endpointPagination,
    handleEndpointSort,
    huntSearch,
    setHuntSearch,
    huntSortBy,
    huntSortOrder,
    huntsData,
    huntsLoading,
    huntsFetching,
    huntPagination,
    handleHuntSort,
    syncMutation,
    handleSync,
    connectorError,
  } = useExplorerEndpointsPage()

  const endpointColumns: Column<VelociraptorEndpoint>[] = [
    { key: 'hostname', label: t('endpoints.hostname'), sortable: true },
    { key: 'os', label: t('endpoints.os'), sortable: true },
    { key: 'ipAddress', label: t('endpoints.ip') },
    {
      key: 'labels',
      label: t('endpoints.labels'),
      render: value => {
        const labels = value as string[]
        if (labels.length === 0) return <span className="text-muted-foreground">—</span>
        return (
          <div className="flex flex-wrap gap-1">
            {labels.map(label => (
              <Badge key={label} variant="outline" className="text-xs">
                {label}
              </Badge>
            ))}
          </div>
        )
      },
    },
    {
      key: 'lastSeenAt',
      label: t('endpoints.lastSeen'),
      sortable: true,
      defaultSortOrder: SortOrder.DESC,
      render: value => <span className="text-xs">{formatDate(value as string)}</span>,
    },
  ]

  const huntColumns: Column<VelociraptorHunt>[] = [
    { key: 'huntId', label: t('endpoints.huntId') },
    { key: 'description', label: t('endpoints.huntDescription'), className: 'max-w-sm truncate' },
    {
      key: 'state',
      label: t('endpoints.state'),
      sortable: true,
      render: value => (
        <Badge variant={value === 'RUNNING' ? 'default' : 'secondary'}>
          {String(value ?? '—')}
        </Badge>
      ),
    },
    { key: 'totalClients', label: t('endpoints.totalClients'), sortable: true },
    { key: 'finishedClients', label: t('endpoints.finishedClients') },
    {
      key: 'createdAt',
      label: t('endpoints.createdAt'),
      sortable: true,
      defaultSortOrder: SortOrder.DESC,
      render: value => <span className="text-xs">{formatDate(value as string)}</span>,
    },
  ]

  // Show error banner if either query fails (connector unavailable/not configured)
  if (connectorError) {
    const errorKey = getErrorKey(connectorError)
    return (
      <div className="space-y-6">
        <PageHeader title={t('endpoints.title')} description={t('endpoints.description')} />
        <div className="bg-status-warning border-status-warning flex items-center gap-2 rounded-lg border p-4">
          <AlertCircle className="text-status-warning h-5 w-5 shrink-0" />
          <p className="text-status-warning text-sm font-medium">{tErrors(errorKey)}</p>
        </div>
      </div>
    )
  }

  if (endpointsLoading || huntsLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('endpoints.title')}
        description={t('endpoints.description')}
        action={{
          label: syncMutation.isPending ? t('endpoints.syncing') : t('endpoints.sync'),
          icon: (
            <RefreshCw className={syncMutation.isPending ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          ),
          onClick: handleSync,
        }}
      />

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as VelociraptorTab)}>
        <TabsList>
          <TabsTrigger value={VelociraptorTab.ENDPOINTS} className="cursor-pointer gap-1.5">
            <Monitor className="h-4 w-4" />
            {t('endpoints.endpointsTab')}
          </TabsTrigger>
          <TabsTrigger value={VelociraptorTab.HUNTS} className="cursor-pointer gap-1.5">
            {t('endpoints.huntsTab')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={VelociraptorTab.ENDPOINTS} className="space-y-4">
          <div className="relative w-full sm:w-64">
            <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              value={endpointSearch}
              onChange={e => setEndpointSearch(e.currentTarget.value)}
              placeholder={t('endpoints.searchPlaceholder')}
              className="ps-9"
            />
          </div>

          {(endpointsData?.data?.length ?? 0) === 0 && !endpointsFetching ? (
            <EmptyState
              icon={<Monitor className="h-6 w-6" />}
              title={t('endpoints.noEndpoints')}
              description={t('endpoints.noEndpointsDescription')}
            />
          ) : (
            <>
              <DataTable
                columns={endpointColumns}
                data={endpointsData?.data ?? []}
                loading={endpointsFetching}
                sortBy={endpointSortBy}
                sortOrder={endpointSortOrder}
                onSort={handleEndpointSort}
              />
              <Pagination
                page={endpointPagination.page}
                totalPages={endpointPagination.totalPages}
                onPageChange={endpointPagination.setPage}
                total={endpointPagination.total}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value={VelociraptorTab.HUNTS} className="space-y-4">
          <div className="relative w-full sm:w-64">
            <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              value={huntSearch}
              onChange={e => setHuntSearch(e.currentTarget.value)}
              placeholder={t('endpoints.huntSearchPlaceholder')}
              className="ps-9"
            />
          </div>

          {(huntsData?.data?.length ?? 0) === 0 && !huntsFetching ? (
            <EmptyState
              icon={<Monitor className="h-6 w-6" />}
              title={t('endpoints.noHunts')}
              description={t('endpoints.noHuntsDescription')}
            />
          ) : (
            <>
              <DataTable
                columns={huntColumns}
                data={huntsData?.data ?? []}
                loading={huntsFetching}
                sortBy={huntSortBy}
                sortOrder={huntSortOrder}
                onSort={handleHuntSort}
              />
              <Pagination
                page={huntPagination.page}
                totalPages={huntPagination.totalPages}
                onPageChange={huntPagination.setPage}
                total={huntPagination.total}
              />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
