'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { SortOrder } from '@/enums'
import { ALL_FILTER } from '@/lib/constants/filters'
import { resolveNotificationMessage } from '@/lib/constants/notifications'
import type { NotificationSearchParams } from '@/types'
import { useDebounce } from './useDebounce'
import { useNotificationsList } from './useNotifications'
import { usePagination } from './usePagination'

export function useNotificationsPageFilters() {
  const t = useTranslations('notifications')
  const tCommon = useTranslations('common')
  const tMessages = useTranslations('notifications.messages')
  const locale = useLocale()

  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [readFilter, setReadFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC)

  const pagination = usePagination({ initialPage: 1, initialLimit: 20 })
  const debouncedSearch = useDebounce(searchQuery, 400)

  const searchParams = useMemo((): NotificationSearchParams => {
    const params: NotificationSearchParams = {
      page: pagination.page,
      limit: pagination.limit,
      sortBy,
      sortOrder,
    }
    if (debouncedSearch.length > 0) {
      params.query = debouncedSearch
    }
    if (typeFilter.length > 0) {
      params.type = typeFilter
    }
    if (readFilter.length > 0) {
      params.isRead = readFilter
    }
    return params
  }, [
    pagination.page,
    pagination.limit,
    sortBy,
    sortOrder,
    debouncedSearch,
    typeFilter,
    readFilter,
  ])

  const { data, isFetching, isLoading } = useNotificationsList(searchParams)

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

  const handleTypeChange = useCallback(
    (value: string) => {
      pagination.setPage(1)
      setTypeFilter(value === ALL_FILTER ? '' : value)
    },
    [pagination]
  )

  const handleReadChange = useCallback(
    (value: string) => {
      pagination.setPage(1)
      setReadFilter(value === ALL_FILTER ? '' : value)
    },
    [pagination]
  )

  const handleClearAllFilters = useCallback(() => {
    pagination.setPage(1)
    setSearchQuery('')
    setTypeFilter('')
    setReadFilter('')
  }, [pagination])

  const handleSort = useCallback(
    (key: string, order: SortOrder) => {
      pagination.setPage(1)
      setSortBy(key)
      setSortOrder(order)
    },
    [pagination]
  )

  const resolveMessage = useCallback(
    (message: string) => resolveNotificationMessage(message, tMessages),
    [tMessages]
  )

  return {
    t,
    tCommon,
    locale,
    data,
    isLoading,
    isFetching,
    pagination,
    searchQuery,
    typeFilter,
    readFilter,
    sortBy,
    sortOrder,
    handleSearchChange,
    handleTypeChange,
    handleReadChange,
    handleClearAllFilters,
    handleSort,
    resolveMessage,
  }
}
