'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { getCloudSecurityColumns } from '@/components/cloud-security/CloudSecurityTableColumns'
import { SortOrder } from '@/enums'
import { ALL_FILTER } from '@/lib/constants/filters'
import type { CloudAccountSearchParams } from '@/types'
import { useCloudAccounts, useCloudSecurityStats } from './useCloudSecurity'
import { useDebounce } from './useDebounce'
import { usePagination } from './usePagination'

export function useCloudSecurityPageFilters() {
  const t = useTranslations('cloudSecurity')
  const tCommon = useTranslations('common')

  const [searchQuery, setSearchQuery] = useState('')
  const [providerFilter, setProviderFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC)

  const pagination = usePagination({ initialPage: 1, initialLimit: 10 })
  const debouncedSearch = useDebounce(searchQuery, 400)

  const searchParams: CloudAccountSearchParams = {
    page: pagination.page,
    limit: pagination.limit,
    sortBy,
    sortOrder,
  }

  if (debouncedSearch.length > 0) {
    searchParams.query = debouncedSearch
  }
  if (providerFilter.length > 0) {
    searchParams.provider = providerFilter
  }
  if (statusFilter.length > 0) {
    searchParams.status = statusFilter
  }

  const { data, isFetching } = useCloudAccounts(searchParams)
  const { data: statsData, isLoading: statsLoading } = useCloudSecurityStats()

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

  const handleProviderChange = useCallback(
    (value: string) => {
      pagination.setPage(1)
      setProviderFilter(value === ALL_FILTER ? '' : value)
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
    () => getCloudSecurityColumns({ cloudSecurity: t, common: tCommon }),
    [t, tCommon]
  )

  const stats = statsData?.data

  return {
    t,
    tCommon,
    data,
    stats,
    statsLoading,
    columns,
    isFetching,
    pagination,
    searchQuery,
    providerFilter: providerFilter.length > 0 ? providerFilter : ALL_FILTER,
    statusFilter: statusFilter.length > 0 ? statusFilter : ALL_FILTER,
    sortBy,
    sortOrder,
    handleSearchChange,
    handleProviderChange,
    handleStatusChange,
    handleSort,
  }
}
