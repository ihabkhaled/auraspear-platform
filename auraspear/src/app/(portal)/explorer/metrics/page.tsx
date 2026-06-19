'use client'

import { BarChart3, Play, Search, AlertCircle } from 'lucide-react'
import { PageHeader, LoadingSpinner, EmptyState, Pagination, DataTable } from '@/components/common'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { useExplorerMetricsPage } from '@/hooks'
import { getErrorKey } from '@/lib/api-error'
import { METRICS_TIME_RANGES } from '@/lib/constants/explorer'
import { formatTimestamp } from '@/lib/utils'
import type { Column } from '@/types'

export default function ExplorerMetricsPage() {
  const {
    t,
    tErrors,
    bucket,
    measurement,
    range,
    limit,
    search,
    sortBy,
    sortOrder,
    currentPage,
    setCurrentPage,
    bucketsLoading,
    bucketsError,
    queryData,
    queryFetching,
    queryError,
    handleQuery,
    parsed,
    filteredRows,
    sortedRows,
    totalPages,
    paginatedRows,
    handleSort,
    handleBucketChange,
    handleMeasurementChange,
    handleRangeChange,
    handleLimitChange,
    handleSearchChange,
    buckets,
  } = useExplorerMetricsPage()

  // Build dynamic columns from parsed headers
  const columns: Column<Record<string, string>>[] = parsed.columns.map(col => ({
    key: col,
    label: col.startsWith('_') ? col.slice(1) : col,
    sortable: true,
    render: value => {
      const strVal = String(value ?? '')
      // Format timestamps
      if (col === '_time' || col === '_start' || col === '_stop') {
        return <span className="text-xs">{formatTimestamp(strVal)}</span>
      }
      return <span className="text-xs">{strVal}</span>
    },
  }))

  // Error state for buckets (connector not configured / unavailable)
  if (bucketsError) {
    const errorKey = getErrorKey(bucketsError)
    return (
      <div className="space-y-6">
        <PageHeader title={t('metrics.title')} description={t('metrics.description')} />
        <div className="bg-status-warning border-status-warning flex items-center gap-2 rounded-lg border p-4">
          <AlertCircle className="text-status-warning h-5 w-5 shrink-0" />
          <p className="text-status-warning text-sm font-medium">{tErrors(errorKey)}</p>
        </div>
      </div>
    )
  }

  if (bucketsLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <PageHeader title={t('metrics.title')} description={t('metrics.description')} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('metrics.queryBuilder')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div className="space-y-2">
              <Label>{t('metrics.bucket')}</Label>
              <Select value={bucket} onValueChange={handleBucketChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t('metrics.selectBucket')} />
                </SelectTrigger>
                <SelectContent>
                  {buckets.map(b => (
                    <SelectItem key={b.name} value={b.name}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('metrics.measurement')}</Label>
              <Input
                value={measurement}
                onChange={e => handleMeasurementChange(e.currentTarget.value)}
                placeholder={t('metrics.measurementPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('metrics.timeRange')}</Label>
              <Select value={range} onValueChange={handleRangeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METRICS_TIME_RANGES.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('metrics.limit')}</Label>
              <Input
                type="number"
                value={limit}
                onChange={e => handleLimitChange(Number(e.currentTarget.value))}
                min={1}
                max={10000}
              />
            </div>
          </div>

          <div className="mt-4">
            <Button onClick={handleQuery} disabled={queryFetching || !bucket}>
              <Play className="me-2 h-4 w-4" />
              {queryFetching ? t('metrics.querying') : t('metrics.runQuery')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {queryError && (
        <div className="bg-status-error border-status-error flex items-center gap-2 rounded-lg border p-4">
          <AlertCircle className="text-status-error h-5 w-5 shrink-0" />
          <p className="text-status-error text-sm font-medium">
            {tErrors(getErrorKey(queryError))}
          </p>
        </div>
      )}

      {queryData?.data && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">
                {t('metrics.results')}
                {sortedRows.length > 0 && (
                  <span className="text-muted-foreground ms-2 text-sm font-normal">
                    {t('metrics.totalRows', { count: filteredRows.length })}
                  </span>
                )}
              </CardTitle>
              {parsed.rows.length > 0 && (
                <div className="relative w-full sm:w-64">
                  <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                  <Input
                    value={search}
                    onChange={e => handleSearchChange(e.currentTarget.value)}
                    placeholder={t('metrics.searchPlaceholder')}
                    className="ps-9"
                  />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {parsed.rows.length === 0 ? (
              <EmptyState
                icon={<BarChart3 className="h-6 w-6" />}
                title={t('metrics.noData')}
                description={t('metrics.noDataDescription')}
              />
            ) : (
              <div className="space-y-4">
                <DataTable
                  columns={columns}
                  data={paginatedRows}
                  loading={queryFetching}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
                <Pagination
                  page={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  total={filteredRows.length}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
