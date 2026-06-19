'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { getSoarPlaybookColumns } from '@/components/soar'
import { SortOrder } from '@/enums'
import { ALL_FILTER } from '@/lib/constants/filters'
import type { SoarPlaybookSearchParams } from '@/types'
import { useDebounce } from './useDebounce'
import { usePagination } from './usePagination'
import { usePlaybooks, usePlaybookStats } from './useSoar'

export function useSoarPageFilters() {
  const t = useTranslations('soar')
  const tCommon = useTranslations('common')

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [triggerFilter, setTriggerFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC)

  const pagination = usePagination({ initialPage: 1, initialLimit: 10 })
  const debouncedSearch = useDebounce(searchQuery, 400)

  const searchParams: SoarPlaybookSearchParams = {
    page: pagination.page,
    limit: pagination.limit,
    sortBy,
    sortOrder,
  }

  if (debouncedSearch.length > 0) {
    searchParams.query = debouncedSearch
  }
  if (statusFilter.length > 0) {
    searchParams.status = statusFilter
  }
  if (triggerFilter.length > 0) {
    searchParams.triggerType = triggerFilter
  }

  const { data, isFetching, isLoading } = usePlaybooks(searchParams)
  const { data: statsData } = usePlaybookStats()

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

  const handleStatusChange = useCallback(
    (value: string) => {
      pagination.setPage(1)
      setStatusFilter(value === ALL_FILTER ? '' : value)
    },
    [pagination]
  )

  const handleTriggerChange = useCallback(
    (value: string) => {
      pagination.setPage(1)
      setTriggerFilter(value === ALL_FILTER ? '' : value)
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

  const columns = useMemo(() => getSoarPlaybookColumns({ soar: t, common: tCommon }), [t, tCommon])

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
    statusFilter: statusFilter.length > 0 ? statusFilter : ALL_FILTER,
    triggerFilter: triggerFilter.length > 0 ? triggerFilter : ALL_FILTER,
    sortBy,
    sortOrder,
    handleSearchChange,
    handleStatusChange,
    handleTriggerChange,
    handleSort,
  }
}
