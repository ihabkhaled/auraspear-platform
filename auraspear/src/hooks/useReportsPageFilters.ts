'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { getReportColumns } from '@/components/reports'
import { SortOrder } from '@/enums'
import type { ReportFormat, ReportStatus, ReportType } from '@/enums'
import { ALL_FILTER } from '@/lib/constants/filters'
import type { ReportSearchParams } from '@/types'
import { useDebounce } from './useDebounce'
import { usePagination } from './usePagination'
import { useReports, useReportStats } from './useReports'

export function useReportsPageFilters() {
  const t = useTranslations('reports')
  const tCommon = useTranslations('common')

  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<ReportType | ''>('')
  const [formatFilter, setFormatFilter] = useState<ReportFormat | ''>('')
  const [statusFilter, setStatusFilter] = useState<ReportStatus | ''>('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC)

  const pagination = usePagination({ initialPage: 1, initialLimit: 10 })
  const debouncedSearch = useDebounce(searchQuery, 400)

  const searchParams: ReportSearchParams = {
    page: pagination.page,
    limit: pagination.limit,
    sortBy,
    sortOrder,
  }

  if (debouncedSearch.length > 0) {
    searchParams.query = debouncedSearch
  }
  if (typeFilter !== '') {
    searchParams.type = typeFilter
  }
  if (formatFilter !== '') {
    searchParams.format = formatFilter
  }
  if (statusFilter !== '') {
    searchParams.status = statusFilter
  }

  const { data, isFetching, isLoading } = useReports(searchParams)
  const { data: statsData } = useReportStats()

  useEffect(() => {
    if (data?.pagination) {
      pagination.setTotal(data.pagination.total)
    }
  }, [data?.pagination, pagination])

  const handleSearchChange = useCallback(
    (value: string) => {
      pagination.setPage(1)
      setSearchQuery(value)
    },
    [pagination]
  )

  const handleTypeChange = useCallback(
    (value: string) => {
      pagination.setPage(1)
      setTypeFilter(value === ALL_FILTER ? '' : (value as ReportType))
    },
    [pagination]
  )

  const handleFormatChange = useCallback(
    (value: string) => {
      pagination.setPage(1)
      setFormatFilter(value === ALL_FILTER ? '' : (value as ReportFormat))
    },
    [pagination]
  )

  const handleStatusChange = useCallback(
    (value: string) => {
      pagination.setPage(1)
      setStatusFilter(value === ALL_FILTER ? '' : (value as ReportStatus))
    },
    [pagination]
  )

  const handleSort = useCallback(
    (key: string, order: SortOrder) => {
      pagination.setPage(1)
      setSortBy(key)
      setSortOrder(order)
    },
    [pagination]
  )

  const columns = useMemo(() => getReportColumns({ reports: t, common: tCommon }), [t, tCommon])

  const stats = statsData?.data

  return {
    t,
    tCommon,
    data,
    stats,
    columns,
    isLoading,
    isFetching,
    pagination,
    searchQuery,
    typeFilter: typeFilter.length > 0 ? typeFilter : ALL_FILTER,
    formatFilter: formatFilter.length > 0 ? formatFilter : ALL_FILTER,
    statusFilter: statusFilter.length > 0 ? statusFilter : ALL_FILTER,
    sortBy,
    sortOrder,
    handleSearchChange,
    handleTypeChange,
    handleFormatChange,
    handleStatusChange,
    handleSort,
  }
}
