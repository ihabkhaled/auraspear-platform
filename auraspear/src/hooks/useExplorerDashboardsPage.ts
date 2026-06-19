'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { SortOrder } from '@/enums'
import { useGrafanaDashboards, useSyncGrafana, usePagination, useDebounce } from '@/hooks'
import { getErrorKey } from '@/lib/api-error'

export function useExplorerDashboardsPage() {
  const t = useTranslations('explorer')
  const tErrors = useTranslations('errors')

  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<string | undefined>()
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.ASC)
  const debouncedSearch = useDebounce(search, 400)
  const pagination = usePagination({ initialPage: 1, initialLimit: 20 })

  const resetPageRef = useRef(pagination.resetPage)
  useEffect(() => {
    resetPageRef.current = pagination.resetPage
  }, [pagination.resetPage])
  useEffect(() => {
    resetPageRef.current()
  }, [debouncedSearch])

  const { data, isLoading, isFetching, error } = useGrafanaDashboards({
    page: pagination.page,
    limit: pagination.limit,
    search: debouncedSearch || undefined,
    sortBy,
    sortOrder,
  })

  useEffect(() => {
    if (data?.pagination) {
      pagination.setTotal(data.pagination.total)
    }
  }, [data?.pagination, pagination])

  const syncMutation = useSyncGrafana()

  const handleSync = useCallback(() => {
    syncMutation.mutate(undefined, {
      onSuccess: result => {
        Toast.success(t('dashboards.syncSuccess', { count: result.data?.synced ?? 0 }))
      },
      onError: err => {
        Toast.error(tErrors(getErrorKey(err)))
      },
    })
  }, [syncMutation, t, tErrors])

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
    syncMutation,
    handleSync,
    handleSort,
    pagination,
  }
}
