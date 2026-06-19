'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Permission, SortOrder, EntitySortField } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { useAuthStore } from '@/stores'
import type { EntitySearchParams } from '@/types'
import { useDebounce } from './useDebounce'
import { useEntities } from './useEntities'
import { useEntityGraphPanel } from './useEntityGraphPanel'
import { usePagination } from './usePagination'

export function useEntitiesPage() {
  const t = useTranslations('entities')
  const tCommon = useTranslations('common')
  const permissions = useAuthStore(s => s.permissions)

  const canCreate = hasPermission(permissions, Permission.ENTITIES_CREATE)
  const canUpdate = hasPermission(permissions, Permission.ENTITIES_UPDATE)

  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [sortBy, setSortBy] = useState<string>(EntitySortField.LAST_SEEN)
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC)

  const pagination = usePagination({ initialPage: 1, initialLimit: 20 })
  const debouncedQuery = useDebounce(searchQuery, 400)

  const searchParams: EntitySearchParams = {
    page: pagination.page,
    limit: pagination.limit,
    sortBy,
    sortOrder,
  }

  if (debouncedQuery.length > 0) {
    searchParams.search = debouncedQuery
  }

  if (typeFilter.length > 0 && typeFilter !== 'all') {
    searchParams.type = typeFilter
  }

  const { data, isFetching } = useEntities(searchParams)
  const entityGraph = useEntityGraphPanel()

  useEffect(() => {
    if (data?.pagination) {
      pagination.setTotal(data.pagination.total)
    }
  }, [data?.pagination, pagination])

  const handleTypeChange = useCallback(
    (value: string) => {
      setTypeFilter(value)
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
    (field: string) => {
      if (sortBy === field) {
        setSortOrder(prev => (prev === SortOrder.ASC ? SortOrder.DESC : SortOrder.ASC))
      } else {
        setSortBy(field)
        setSortOrder(SortOrder.DESC)
      }
      pagination.setPage(1)
    },
    [sortBy, pagination]
  )

  return {
    t,
    tCommon,
    canCreate,
    canUpdate,
    searchQuery,
    typeFilter,
    sortBy,
    sortOrder,
    pagination,
    data,
    isFetching,
    handleTypeChange,
    handleSearchChange,
    handleSort,
    graphOpen: entityGraph.graphOpen,
    setGraphOpen: entityGraph.setGraphOpen,
    graphData: entityGraph.graphData,
    graphLoading: entityGraph.graphLoading,
    handleOpenGraph: entityGraph.handleOpenGraph,
    handleCloseGraph: entityGraph.handleCloseGraph,
  }
}
