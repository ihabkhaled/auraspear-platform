'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { getComplianceColumns } from '@/components/compliance'
import { SortOrder } from '@/enums'
import { ALL_FILTER } from '@/lib/constants/filters'
import type { ComplianceSearchParams } from '@/types'
import { useComplianceFrameworks, useComplianceStats } from './useCompliance'
import { useDebounce } from './useDebounce'
import { usePagination } from './usePagination'

export function useCompliancePageFilters() {
  const t = useTranslations('compliance')
  const tCommon = useTranslations('common')

  const [searchQuery, setSearchQuery] = useState('')
  const [standardFilter, setStandardFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC)

  const pagination = usePagination({ initialPage: 1, initialLimit: 10 })
  const debouncedSearch = useDebounce(searchQuery, 400)

  const searchParams: ComplianceSearchParams = {
    page: pagination.page,
    limit: pagination.limit,
    sortBy,
    sortOrder,
  }

  if (debouncedSearch.length > 0) {
    searchParams.query = debouncedSearch
  }
  if (standardFilter.length > 0) {
    searchParams.standard = standardFilter
  }

  const { data, isFetching, isLoading } = useComplianceFrameworks(searchParams)
  const { data: statsData } = useComplianceStats()

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

  const handleStandardChange = useCallback(
    (value: string) => {
      pagination.setPage(1)
      setStandardFilter(value === ALL_FILTER ? '' : value)
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
    () => getComplianceColumns({ compliance: t, common: tCommon }),
    [t, tCommon]
  )

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
    standardFilter: standardFilter.length > 0 ? standardFilter : ALL_FILTER,
    sortBy,
    sortOrder,
    handleSearchChange,
    handleStandardChange,
    handleSort,
  }
}
