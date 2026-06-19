'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { getUebaColumns } from '@/components/ueba'
import { SortOrder } from '@/enums'
import { ALL_FILTER } from '@/lib/constants/filters'
import type { UebaEntitySearchParams } from '@/types'
import { useDebounce } from './useDebounce'
import { usePagination } from './usePagination'
import { useUebaEntities, useUebaStats } from './useUeba'

export function useUebaPageFilters() {
  const t = useTranslations('ueba')
  const tCommon = useTranslations('common')

  const [searchQuery, setSearchQuery] = useState('')
  const [entityTypeFilter, setEntityTypeFilter] = useState('')
  const [riskLevelFilter, setRiskLevelFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC)

  const pagination = usePagination({ initialPage: 1, initialLimit: 10 })
  const debouncedQuery = useDebounce(searchQuery, 400)

  const searchParams: UebaEntitySearchParams = {
    page: pagination.page,
    limit: pagination.limit,
    sortBy,
    sortOrder,
  }

  if (debouncedQuery.length > 0) {
    searchParams.query = debouncedQuery
  }

  if (entityTypeFilter.length > 0) {
    searchParams.entityType = entityTypeFilter
  }

  if (riskLevelFilter.length > 0) {
    searchParams.riskLevel = riskLevelFilter
  }

  const { data, isFetching } = useUebaEntities(searchParams)
  const { data: statsData } = useUebaStats()

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

  const handleEntityTypeChange = useCallback(
    (value: string) => {
      setEntityTypeFilter(value === ALL_FILTER ? '' : value)
      pagination.setPage(1)
    },
    [pagination]
  )

  const handleRiskLevelChange = useCallback(
    (value: string) => {
      setRiskLevelFilter(value === ALL_FILTER ? '' : value)
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

  const columns = useMemo(() => getUebaColumns({ ueba: t }), [t])

  return {
    t,
    tCommon,
    searchQuery,
    setSearchQuery: handleSearchChange,
    entityTypeFilter: entityTypeFilter.length > 0 ? entityTypeFilter : ALL_FILTER,
    setEntityTypeFilter: handleEntityTypeChange,
    riskLevelFilter: riskLevelFilter.length > 0 ? riskLevelFilter : ALL_FILTER,
    setRiskLevelFilter: handleRiskLevelChange,
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
