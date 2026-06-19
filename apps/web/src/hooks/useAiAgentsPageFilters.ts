'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { getAiAgentColumns } from '@/components/ai-agents'
import { SortOrder } from '@/enums'
import { ALL_FILTER } from '@/lib/constants/filters'
import type { AiAgentSearchParams } from '@/types'
import { useAiAgents, useAiAgentStats } from './useAiAgents'
import { useDebounce } from './useDebounce'
import { usePagination } from './usePagination'

export function useAiAgentsPageFilters() {
  const t = useTranslations('aiAgents')

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC)

  const pagination = usePagination({ initialPage: 1, initialLimit: 10 })
  const debouncedQuery = useDebounce(searchQuery, 400)

  const searchParams: AiAgentSearchParams = {
    page: pagination.page,
    limit: pagination.limit,
    sortBy,
    sortOrder,
  }

  if (debouncedQuery.length > 0) {
    searchParams.query = debouncedQuery
  }

  if (statusFilter.length > 0) {
    searchParams.status = statusFilter
  }

  if (tierFilter.length > 0) {
    searchParams.tier = tierFilter
  }

  const { data, isFetching } = useAiAgents(searchParams)
  const { data: statsData } = useAiAgentStats()

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

  const handleStatusChange = useCallback(
    (value: string) => {
      setStatusFilter(value === ALL_FILTER ? '' : value)
      pagination.setPage(1)
    },
    [pagination]
  )

  const handleTierChange = useCallback(
    (value: string) => {
      setTierFilter(value === ALL_FILTER ? '' : value)
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

  const columns = useMemo(() => getAiAgentColumns({ aiAgents: t }), [t])

  return {
    t,
    searchQuery,
    setSearchQuery: handleSearchChange,
    statusFilter: statusFilter.length > 0 ? statusFilter : ALL_FILTER,
    setStatusFilter: handleStatusChange,
    tierFilter: tierFilter.length > 0 ? tierFilter : ALL_FILTER,
    setTierFilter: handleTierChange,
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
