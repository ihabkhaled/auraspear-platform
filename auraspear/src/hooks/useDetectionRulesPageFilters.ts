'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { getDetectionRuleColumns } from '@/components/detection-rules/DetectionRuleTableColumns'
import { SortOrder } from '@/enums'
import { ALL_FILTER } from '@/lib/constants/filters'
import type { DetectionRuleSearchParams } from '@/types'
import { useDebounce } from './useDebounce'
import { useDetectionRules, useDetectionRuleStats } from './useDetectionRules'
import { usePagination } from './usePagination'

export function useDetectionRulesPageFilters() {
  const t = useTranslations('detectionRules')
  const tCommon = useTranslations('common')

  const [searchQuery, setSearchQuery] = useState('')
  const [ruleTypeFilter, setRuleTypeFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC)

  const pagination = usePagination({ initialPage: 1, initialLimit: 10 })
  const debouncedSearch = useDebounce(searchQuery, 400)

  const searchParams: DetectionRuleSearchParams = {
    page: pagination.page,
    limit: pagination.limit,
    sortBy,
    sortOrder,
  }

  if (debouncedSearch.length > 0) {
    searchParams.query = debouncedSearch
  }
  if (ruleTypeFilter.length > 0) {
    searchParams.ruleType = ruleTypeFilter
  }
  if (severityFilter.length > 0) {
    searchParams.severity = severityFilter
  }
  if (statusFilter.length > 0) {
    searchParams.status = statusFilter
  }

  const { data, isFetching } = useDetectionRules(searchParams)
  const { data: statsData, isLoading: statsLoading } = useDetectionRuleStats()

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

  const handleRuleTypeChange = useCallback(
    (value: string) => {
      pagination.setPage(1)
      setRuleTypeFilter(value === ALL_FILTER ? '' : value)
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
    () => getDetectionRuleColumns({ detectionRules: t, common: tCommon }),
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
    ruleTypeFilter: ruleTypeFilter.length > 0 ? ruleTypeFilter : ALL_FILTER,
    severityFilter: severityFilter.length > 0 ? severityFilter : ALL_FILTER,
    statusFilter: statusFilter.length > 0 ? statusFilter : ALL_FILTER,
    sortBy,
    sortOrder,
    handleSearchChange,
    handleRuleTypeChange,
    handleSeverityChange,
    handleStatusChange,
    handleSort,
  }
}
