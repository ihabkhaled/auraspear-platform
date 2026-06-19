'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { getIncidentColumns } from '@/components/incidents'
import { SortOrder } from '@/enums'
import { ALL_FILTER } from '@/lib/constants/filters'
import type { IncidentSearchParams } from '@/types'
import { useTenantMembers } from './useCases'
import { useDebounce } from './useDebounce'
import { useIncidents, useIncidentStats } from './useIncidents'
import { usePagination } from './usePagination'

export function useIncidentPageFilters() {
  const t = useTranslations('incidents')
  const tCommon = useTranslations('common')

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC)

  const pagination = usePagination({ initialPage: 1, initialLimit: 10 })
  const debouncedSearch = useDebounce(searchQuery, 400)

  const searchParams: IncidentSearchParams = {
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
  if (severityFilter.length > 0) {
    searchParams.severity = severityFilter
  }
  if (categoryFilter.length > 0) {
    searchParams.category = categoryFilter
  }

  const { data, isFetching, isLoading } = useIncidents(searchParams)
  const { data: statsData, isLoading: statsLoading } = useIncidentStats()
  const { data: membersData } = useTenantMembers()

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

  const handleSeverityChange = useCallback(
    (value: string) => {
      pagination.setPage(1)
      setSeverityFilter(value === ALL_FILTER ? '' : value)
    },
    [pagination]
  )

  const handleCategoryChange = useCallback(
    (value: string) => {
      pagination.setPage(1)
      setCategoryFilter(value === ALL_FILTER ? '' : value)
    },
    [pagination]
  )

  const handleClearAllFilters = useCallback(() => {
    pagination.setPage(1)
    setSearchQuery('')
    setStatusFilter('')
    setSeverityFilter('')
    setCategoryFilter('')
  }, [pagination])

  const handleSort = useCallback(
    (key: string, order: SortOrder) => {
      pagination.setPage(1)
      setSortBy(key)
      setSortOrder(order)
    },
    [pagination]
  )

  const columns = useMemo(() => getIncidentColumns({ incidents: t, common: tCommon }), [t, tCommon])

  const stats = statsData?.data

  const assigneeOptions = useMemo(
    () => (membersData?.data ?? []).map(m => ({ value: m.id, label: m.name })),
    [membersData?.data]
  )

  return {
    t,
    tCommon,
    data,
    stats,
    statsLoading,
    columns,
    isLoading,
    isFetching,
    pagination,
    searchQuery,
    statusFilter: statusFilter.length > 0 ? statusFilter : ALL_FILTER,
    severityFilter: severityFilter.length > 0 ? severityFilter : ALL_FILTER,
    categoryFilter: categoryFilter.length > 0 ? categoryFilter : ALL_FILTER,
    sortBy,
    sortOrder,
    assigneeOptions,
    handleSearchChange,
    handleStatusChange,
    handleSeverityChange,
    handleCategoryChange,
    handleClearAllFilters,
    handleSort,
  }
}
