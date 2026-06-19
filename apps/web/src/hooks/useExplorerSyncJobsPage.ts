'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { SortOrder } from '@/enums'
import { useSyncJobs, usePagination } from '@/hooks'

export function useExplorerSyncJobsPage() {
  const t = useTranslations('explorer')

  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC)
  const pagination = usePagination({ initialPage: 1, initialLimit: 20 })

  const { data, isLoading, isFetching } = useSyncJobs({
    page: pagination.page,
    limit: pagination.limit,
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
    sortOrder,
    data,
    isLoading,
    isFetching,
    handleSort,
    pagination,
  }
}
