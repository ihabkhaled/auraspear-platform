'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { getAttackPathColumns } from '@/components/attack-paths'
import { SortOrder } from '@/enums'
import { ALL_FILTER } from '@/lib/constants/filters'
import type { AttackPathSearchParams } from '@/types'
import { useAttackPaths, useAttackPathStats } from './useAttackPaths'
import { useDebounce } from './useDebounce'
import { usePagination } from './usePagination'

export function useAttackPathsPageFilters() {
  const t = useTranslations('attackPath')
  const tCommon = useTranslations('common')

  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC)

  const pagination = usePagination({ initialPage: 1, initialLimit: 10 })
  const debouncedQuery = useDebounce(searchQuery, 400)

  const searchParams: AttackPathSearchParams = {
    page: pagination.page,
    limit: pagination.limit,
    sortBy,
    sortOrder,
  }

  if (debouncedQuery.length > 0) {
    searchParams.query = debouncedQuery
  }

  if (severityFilter.length > 0) {
    searchParams.severity = severityFilter
  }

  if (statusFilter.length > 0) {
    searchParams.status = statusFilter
  }

  const { data, isFetching } = useAttackPaths(searchParams)
  const { data: statsData } = useAttackPathStats()

  useEffect(() => {
    if (data?.pagination) {
      pagination.setTotal(data.pagination.total)
    }
  }, [data?.pagination, pagination])

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value)
      pagination.setPage(1)
    },
    [pagination]
  )

  const handleSeverityChange = useCallback(
    (value: string) => {
      setSeverityFilter(value === ALL_FILTER ? '' : value)
      pagination.setPage(1)
    },
    [pagination]
  )

  const handleStatusChange = useCallback(
    (value: string) => {
      setStatusFilter(value === ALL_FILTER ? '' : value)
      pagination.setPage(1)
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

  const columns = useMemo(() => getAttackPathColumns({ attackPath: t }), [t])

  return {
    t,
    tCommon,
    searchQuery,
    setSearchQuery: handleSearchChange,
    severityFilter: severityFilter.length > 0 ? severityFilter : ALL_FILTER,
    setSeverityFilter: handleSeverityChange,
    statusFilter: statusFilter.length > 0 ? statusFilter : ALL_FILTER,
    setStatusFilter: handleStatusChange,
    sortBy,
    sortOrder,
    handleSort,
    isFetching,
    data,
    stats: statsData?.data ?? null,
    pagination,
    columns,
  }
}
