'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { getSystemHealthColumns } from '@/components/system-health/SystemHealthTableColumns'
import { SortOrder } from '@/enums'
import { ALL_FILTER } from '@/lib/constants/filters'
import type { HealthCheckSearchParams } from '@/types'
import { useDebounce } from './useDebounce'
import { usePagination } from './usePagination'
import {
  useHealthChecks,
  useLatestHealthChecks,
  useSystemHealthStats,
  useSystemMetrics,
} from './useSystemHealth'

export function useSystemHealthPageFilters() {
  const t = useTranslations('systemHealth')
  const tCommon = useTranslations('common')

  const [searchQuery, setSearchQuery] = useState('')
  const [serviceTypeFilter, setServiceTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('checkedAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC)

  const pagination = usePagination({ initialPage: 1, initialLimit: 10 })
  const debouncedSearch = useDebounce(searchQuery, 400)

  const searchParams: HealthCheckSearchParams = {
    page: pagination.page,
    limit: pagination.limit,
    sortBy,
    sortOrder,
  }

  if (debouncedSearch.length > 0) {
    searchParams.query = debouncedSearch
  }
  if (serviceTypeFilter.length > 0) {
    searchParams.serviceType = serviceTypeFilter
  }
  if (statusFilter.length > 0) {
    searchParams.status = statusFilter
  }

  const { data, isFetching } = useHealthChecks(searchParams)
  const { data: latestData } = useLatestHealthChecks()
  const { data: statsData, isLoading: statsLoading } = useSystemHealthStats()
  const { data: metricsData } = useSystemMetrics()

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

  const handleServiceTypeChange = useCallback(
    (value: string) => {
      pagination.setPage(1)
      setServiceTypeFilter(value === ALL_FILTER ? '' : value)
    },
    [pagination]
  )

  const handleStatusChange = useCallback(
    (value: string) => {
      pagination.setPage(1)
      setStatusFilter(value === ALL_FILTER ? '' : value)
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

  const columns = useMemo(
    () => getSystemHealthColumns({ systemHealth: t, common: tCommon }),
    [t, tCommon]
  )

  const stats = statsData?.data
  const latestChecks = latestData?.data ?? []

  return {
    t,
    tCommon,
    data,
    stats,
    statsLoading,
    latestChecks,
    columns,
    metricsData,
    searchQuery,
    handleSearchChange,
    isFetching,
    pagination,
    serviceTypeFilter: serviceTypeFilter.length > 0 ? serviceTypeFilter : ALL_FILTER,
    statusFilter: statusFilter.length > 0 ? statusFilter : ALL_FILTER,
    sortBy,
    sortOrder,
    handleServiceTypeChange,
    handleStatusChange,
    handleSort,
  }
}
