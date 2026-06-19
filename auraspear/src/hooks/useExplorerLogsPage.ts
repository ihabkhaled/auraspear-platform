'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { SortOrder } from '@/enums'
import { useGraylogLogs, usePagination, useDebounce } from '@/hooks'

export function useExplorerLogsPage() {
  const t = useTranslations('explorer')
  const tErrors = useTranslations('errors')

  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<string | undefined>()
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC)
  const debouncedSearch = useDebounce(search, 400)
  const pagination = usePagination({ initialPage: 1, initialLimit: 20 })

  const resetPageRef = useRef(pagination.resetPage)
  useEffect(() => {
    resetPageRef.current = pagination.resetPage
  }, [pagination.resetPage])
  useEffect(() => {
    resetPageRef.current()
  }, [debouncedSearch])

  const { data, isLoading, isFetching, error } = useGraylogLogs({
    page: pagination.page,
    limit: pagination.limit,
    query: debouncedSearch || undefined,
    sortOrder,
  })

  useEffect(() => {
    if (data?.pagination) {
      pagination.setTotal(data.pagination.total)
    }
  }, [data?.pagination, pagination])

  const handleSort = useCallback(
    (key: string, order: SortOrder) => {
      pagination.setPage(1)
      setSortBy(key)
      setSortOrder(order)
    },
    [pagination]
  )

  return {
    t,
    tErrors,
    search,
    setSearch,
    sortBy,
    sortOrder,
    data,
    isLoading,
    isFetching,
    error,
    handleSort,
    pagination,
  }
}
