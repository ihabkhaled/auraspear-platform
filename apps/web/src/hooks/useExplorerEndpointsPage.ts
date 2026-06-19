'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { SortOrder, VelociraptorTab } from '@/enums'
import {
  useVelociraptorEndpoints,
  useVelociraptorHunts,
  useSyncVelociraptor,
  usePagination,
  useDebounce,
} from '@/hooks'
import { getErrorKey } from '@/lib/api-error'

export function useExplorerEndpointsPage() {
  const t = useTranslations('explorer')
  const tErrors = useTranslations('errors')
  const [activeTab, setActiveTab] = useState<VelociraptorTab>(VelociraptorTab.ENDPOINTS)

  // Endpoints state
  const [endpointSearch, setEndpointSearch] = useState('')
  const [endpointSortBy, setEndpointSortBy] = useState<string | undefined>()
  const [endpointSortOrder, setEndpointSortOrder] = useState<SortOrder>(SortOrder.ASC)
  const debouncedEndpointSearch = useDebounce(endpointSearch, 400)
  const endpointPagination = usePagination({ initialPage: 1, initialLimit: 20 })

  const endpointResetRef = useRef(endpointPagination.resetPage)
  useEffect(() => {
    endpointResetRef.current = endpointPagination.resetPage
  }, [endpointPagination.resetPage])
  useEffect(() => {
    endpointResetRef.current()
  }, [debouncedEndpointSearch])

  // Hunts state
  const [huntSearch, setHuntSearch] = useState('')
  const [huntSortBy, setHuntSortBy] = useState<string | undefined>()
  const [huntSortOrder, setHuntSortOrder] = useState<SortOrder>(SortOrder.DESC)
  const debouncedHuntSearch = useDebounce(huntSearch, 400)
  const huntPagination = usePagination({ initialPage: 1, initialLimit: 20 })

  const huntResetRef = useRef(huntPagination.resetPage)
  useEffect(() => {
    huntResetRef.current = huntPagination.resetPage
  }, [huntPagination.resetPage])
  useEffect(() => {
    huntResetRef.current()
  }, [debouncedHuntSearch])

  const {
    data: endpointsData,
    isLoading: endpointsLoading,
    isFetching: endpointsFetching,
    error: endpointsError,
  } = useVelociraptorEndpoints({
    page: endpointPagination.page,
    limit: endpointPagination.limit,
    search: debouncedEndpointSearch || undefined,
    sortBy: endpointSortBy,
    sortOrder: endpointSortOrder,
  })

  const {
    data: huntsData,
    isLoading: huntsLoading,
    isFetching: huntsFetching,
    error: huntsError,
  } = useVelociraptorHunts({
    page: huntPagination.page,
    limit: huntPagination.limit,
    search: debouncedHuntSearch || undefined,
    sortBy: huntSortBy,
    sortOrder: huntSortOrder,
  })

  useEffect(() => {
    if (endpointsData?.pagination) {
      endpointPagination.setTotal(endpointsData.pagination.total)
    }
  }, [endpointsData?.pagination, endpointPagination])

  useEffect(() => {
    if (huntsData?.pagination) {
      huntPagination.setTotal(huntsData.pagination.total)
    }
  }, [huntsData?.pagination, huntPagination])

  const syncMutation = useSyncVelociraptor()

  const handleSync = useCallback(() => {
    syncMutation.mutate(undefined, {
      onSuccess: result => {
        Toast.success(
          t('endpoints.syncSuccess', {
            endpoints: result.data?.endpoints ?? 0,
            hunts: result.data?.hunts ?? 0,
          })
        )
      },
      onError: err => {
        Toast.error(tErrors(getErrorKey(err)))
      },
    })
  }, [syncMutation, t, tErrors])

  const handleEndpointSort = useCallback(
    (key: string, order: SortOrder) => {
      endpointPagination.setPage(1)
      setEndpointSortBy(key)
      setEndpointSortOrder(order)
    },
    [endpointPagination]
  )

  const handleHuntSort = useCallback(
    (key: string, order: SortOrder) => {
      huntPagination.setPage(1)
      setHuntSortBy(key)
      setHuntSortOrder(order)
    },
    [huntPagination]
  )

  const connectorError = endpointsError ?? huntsError

  return {
    t,
    tErrors,
    activeTab,
    setActiveTab,
    // Endpoints
    endpointSearch,
    setEndpointSearch,
    endpointSortBy,
    endpointSortOrder,
    endpointsData,
    endpointsLoading,
    endpointsFetching,
    endpointPagination,
    handleEndpointSort,
    // Hunts
    huntSearch,
    setHuntSearch,
    huntSortBy,
    huntSortOrder,
    huntsData,
    huntsLoading,
    huntsFetching,
    huntPagination,
    handleHuntSort,
    // Sync
    syncMutation,
    handleSync,
    // Error
    connectorError,
  }
}
