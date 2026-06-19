'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { SortOrder } from '@/enums'
import { useLogstashLogs, useSyncLogstash, usePagination, useDebounce } from '@/hooks'
import { getErrorKey } from '@/lib/api-error'

export function useExplorerPipelinesPage() {
  const t = useTranslations('explorer')
  const tErrors = useTranslations('errors')

  const [search, setSearch] = useState('')
  const [level, setLevel] = useState<string>('')
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
  }, [debouncedSearch, level])

  const { data, isLoading, isFetching, error } = useLogstashLogs({
    page: pagination.page,
    limit: pagination.limit,
    search: debouncedSearch || undefined,
    level: level || undefined,
    sortBy,
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

  const syncMutation = useSyncLogstash()

  const handleSync = useCallback(() => {
    syncMutation.mutate(undefined, {
      onSuccess: () => {
        Toast.success(t('pipelines.syncSuccess'))
      },
      onError: (err: unknown) => {
        Toast.error(tErrors(getErrorKey(err)))
      },
    })
  }, [syncMutation, t, tErrors])

  return {
    t,
    tErrors,
    search,
    setSearch,
    level,
    setLevel,
    sortBy,
    sortOrder,
    data,
    isLoading,
    isFetching,
    error,
    syncMutation,
    handleSync,
    handleSort,
    pagination,
  }
}
