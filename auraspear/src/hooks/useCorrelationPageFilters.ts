import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { getCorrelationColumns } from '@/components/correlation'
import { SortOrder } from '@/enums'
import { TAB_SOURCE_MAP } from '@/lib/constants/correlation'
import { lookup } from '@/lib/utils'
import type { CorrelationSearchParams } from '@/types'
import { useCorrelationRules, useCorrelationStats } from './useCorrelation'
import { useDebounce } from './useDebounce'
import { usePagination } from './usePagination'

export function useCorrelationPageFilters() {
  const t = useTranslations('correlation')

  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC)

  const pagination = usePagination({ initialPage: 1, initialLimit: 10 })
  const debouncedQuery = useDebounce(searchQuery, 400)

  const searchParams: CorrelationSearchParams = {
    page: pagination.page,
    limit: pagination.limit,
    sortBy,
    sortOrder,
  }

  const sourceFromTab = lookup(TAB_SOURCE_MAP, activeTab)
  if (sourceFromTab) {
    searchParams.source = sourceFromTab
  }

  if (severityFilter.length > 0) {
    searchParams.severity = severityFilter
  }

  if (statusFilter.length > 0) {
    searchParams.status = statusFilter
  }

  if (debouncedQuery.length > 0) {
    searchParams.query = debouncedQuery
  }

  const { data, isFetching } = useCorrelationRules(searchParams)
  const { data: statsData } = useCorrelationStats()

  useEffect(() => {
    if (data?.pagination) {
      pagination.setTotal(data.pagination.total)
    }
  }, [data?.pagination, pagination])

  const handleTabChange = useCallback(
    (tab: string) => {
      setActiveTab(tab)
      pagination.setPage(1)
    },
    [pagination]
  )

  const handleSeverityFilterChange = useCallback(
    (value: string) => {
      setSeverityFilter(value)
      pagination.setPage(1)
    },
    [pagination]
  )

  const handleStatusFilterChange = useCallback(
    (value: string) => {
      setStatusFilter(value)
      pagination.setPage(1)
    },
    [pagination]
  )

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value)
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

  const columns = useMemo(() => getCorrelationColumns({ correlation: t }), [t])

  return {
    t,
    searchQuery,
    setSearchQuery: handleSearchChange,
    activeTab,
    setActiveTab: handleTabChange,
    severityFilter,
    setSeverityFilter: handleSeverityFilterChange,
    statusFilter,
    setStatusFilter: handleStatusFilterChange,
    isFetching,
    data,
    stats: statsData?.data ?? null,
    pagination,
    columns,
    sortBy,
    sortOrder,
    handleSort,
  }
}
