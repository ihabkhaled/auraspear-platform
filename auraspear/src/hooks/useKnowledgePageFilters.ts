'use client'

import { useCallback, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { SortOrder } from '@/enums'
import { buildRunbookColumns } from '@/lib/knowledge.utils'
import { useTenantStore } from '@/stores'
import type { RunbookColumnTranslations } from '@/types'
import { useRunbooks } from './useRunbooks'

export function useKnowledgePageFilters() {
  const t = useTranslations('knowledge')
  const tCommon = useTranslations('common')
  const tenantId = useTenantStore(s => s.currentTenantId)

  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC)

  const queryParams = useMemo(
    () => ({
      page: currentPage,
      limit: 20,
      q: searchQuery.length > 0 ? searchQuery : undefined,
      category: categoryFilter.length > 0 ? categoryFilter : undefined,
      sortBy,
      sortOrder,
    }),
    [currentPage, searchQuery, categoryFilter, sortBy, sortOrder]
  )

  const { data: response, isLoading, isFetching } = useRunbooks(queryParams)
  const data = response?.data ?? []
  const pagination = response?.pagination

  const columnTranslations: RunbookColumnTranslations = useMemo(
    () => ({
      title: t('colTitle'),
      category: t('colCategory'),
      tags: t('colTags'),
      createdBy: t('colCreatedBy'),
      actions: t('colActions'),
      updatedAt: tCommon('updatedAt'),
    }),
    [t, tCommon]
  )

  const columns = useMemo(() => buildRunbookColumns(columnTranslations), [columnTranslations])

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }, [])

  const handleCategoryChange = useCallback((value: string) => {
    setCategoryFilter(value)
    setCurrentPage(1)
  }, [])

  const handleSort = useCallback(
    (field: string) => {
      if (sortBy === field) {
        setSortOrder((prev): SortOrder => (prev === SortOrder.ASC ? SortOrder.DESC : SortOrder.ASC))
      } else {
        setSortBy(field)
        setSortOrder(SortOrder.DESC)
      }
      setCurrentPage(1)
    },
    [sortBy]
  )

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  return {
    t,
    tCommon,
    tenantId,
    data,
    columns,
    isLoading,
    isFetching,
    pagination,
    currentPage,
    searchQuery,
    categoryFilter,
    sortBy,
    sortOrder,
    handleSearchChange,
    handleCategoryChange,
    handleSort,
    handlePageChange,
  }
}
