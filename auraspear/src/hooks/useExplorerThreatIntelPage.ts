'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { SortOrder } from '@/enums'
import { useMispExplorerEvents, usePagination, useDebounce } from '@/hooks'

export function useExplorerThreatIntelPage() {
  const t = useTranslations('explorer')
  const tErrors = useTranslations('errors')

  const [search, setSearch] = useState('')
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

  const { data, isLoading, isFetching, error } = useMispExplorerEvents({
    page: pagination.page,
    limit: pagination.limit,
    value: debouncedSearch || undefined,
    sortOrder,
  })

  useEffect(() => {
    if (data?.pagination) {
      pagination.setTotal(data.pagination.total)
    }
  }, [data?.pagination, pagination])

  const handleSort = useCallback(
    (_key: string, order: SortOrder) => {
      pagination.setPage(1)
      setSortOrder(order)
    },
    [pagination]
  )

  return {
    t,
    tErrors,
    search,
    setSearch,
    sortOrder,
    data,
    isLoading,
    isFetching,
    error,
    handleSort,
    pagination,
  }
}
