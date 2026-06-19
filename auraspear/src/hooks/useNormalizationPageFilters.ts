'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { getNormalizationColumns } from '@/components/normalization/NormalizationTableColumns'
import { SortOrder } from '@/enums'
import { ALL_FILTER } from '@/lib/constants/filters'
import type { NormalizationSearchParams } from '@/types'
import { useDebounce } from './useDebounce'
import { useNormalizationPipelines, useNormalizationStats } from './useNormalization'
import { usePagination } from './usePagination'

export function useNormalizationPageFilters() {
  const t = useTranslations('normalization')
  const tCommon = useTranslations('common')

  const [searchQuery, setSearchQuery] = useState('')
  const [sourceTypeFilter, setSourceTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC)

  const pagination = usePagination({ initialPage: 1, initialLimit: 10 })
  const debouncedSearch = useDebounce(searchQuery, 400)

  const searchParams: NormalizationSearchParams = {
    page: pagination.page,
    limit: pagination.limit,
    sortBy,
    sortOrder,
  }

  if (debouncedSearch.length > 0) {
    searchParams.query = debouncedSearch
  }
  if (sourceTypeFilter.length > 0) {
    searchParams.sourceType = sourceTypeFilter
  }
  if (statusFilter.length > 0) {
    searchParams.status = statusFilter
  }

  const { data, isFetching } = useNormalizationPipelines(searchParams)
  const { data: statsData, isLoading: statsLoading } = useNormalizationStats()

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

  const handleSourceTypeChange = useCallback(
    (value: string) => {
      pagination.setPage(1)
      setSourceTypeFilter(value === ALL_FILTER ? '' : value)
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
    () => getNormalizationColumns({ normalization: t, common: tCommon }),
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
    sourceTypeFilter: sourceTypeFilter.length > 0 ? sourceTypeFilter : ALL_FILTER,
    statusFilter: statusFilter.length > 0 ? statusFilter : ALL_FILTER,
    sortBy,
    sortOrder,
    handleSearchChange,
    handleSourceTypeChange,
    handleStatusChange,
    handleSort,
  }
}
