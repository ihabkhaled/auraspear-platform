import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import type { SortOrder } from '@/enums'
import { useAiIntel } from './useAiIntel'
import { useIntelStats, useMISPEvents, useIOCSearch } from './useIntel'
import { usePagination } from './usePagination'

export function useIntelPage() {
  const t = useTranslations('intel')
  const aiIntel = useAiIntel()
  const [iocQuery, setIocQuery] = useState('')
  const [iocType, setIocType] = useState('')
  const [iocSource, setIocSource] = useState('')

  const [mispSortBy, setMispSortBy] = useState<string | undefined>()
  const [mispSortOrder, setMispSortOrder] = useState<SortOrder | undefined>()
  const [iocSortBy, setIocSortBy] = useState<string | undefined>()
  const [iocSortOrder, setIocSortOrder] = useState<SortOrder | undefined>()

  const mispPagination = usePagination({ initialPage: 1, initialLimit: 10 })
  const iocPagination = usePagination({ initialPage: 1, initialLimit: 10 })

  const { data: mispData, isLoading: mispLoading } = useMISPEvents({
    page: mispPagination.page,
    limit: mispPagination.limit,
    ...(mispSortBy !== undefined && { sortBy: mispSortBy }),
    ...(mispSortOrder !== undefined && { sortOrder: mispSortOrder }),
  })

  const { data: statsData, isLoading: statsLoading } = useIntelStats()

  const { data: iocData, isLoading: iocLoading } = useIOCSearch(
    iocQuery,
    iocType,
    iocPagination.page,
    iocPagination.limit,
    iocSortBy,
    iocSortOrder,
    iocSource
  )

  useEffect(() => {
    if (mispData?.pagination) {
      mispPagination.setTotal(mispData.pagination.total)
    }
  }, [mispData?.pagination, mispPagination])

  useEffect(() => {
    if (iocData?.pagination) {
      iocPagination.setTotal(iocData.pagination.total)
    }
  }, [iocData?.pagination, iocPagination])

  const stats = {
    threatActors: statsData?.threatActors ?? 0,
    ipIOCs: statsData?.ipIOCs ?? 0,
    fileHashes: statsData?.fileHashes ?? 0,
    activeDomains: statsData?.activeDomains ?? 0,
  }

  const handleIOCSearch = useCallback(
    (query: string, type: string, source: string) => {
      iocPagination.setPage(1)
      setIocQuery(query)
      setIocType(type)
      setIocSource(source)
    },
    [iocPagination]
  )

  const handleMispSort = useCallback(
    (key: string, order: SortOrder) => {
      mispPagination.setPage(1)
      setMispSortBy(key)
      setMispSortOrder(order)
    },
    [mispPagination]
  )

  const handleIocSort = useCallback(
    (key: string, order: SortOrder) => {
      iocPagination.setPage(1)
      setIocSortBy(key)
      setIocSortOrder(order)
    },
    [iocPagination]
  )

  const iocIds = (iocData?.data ?? []).map(ioc => ioc.id)
  const firstIocId = iocIds.length > 0 ? iocIds.at(0) : undefined

  return {
    t,
    mispData,
    mispLoading,
    mispPagination,
    mispSortBy,
    mispSortOrder,
    handleMispSort,
    iocData,
    iocLoading,
    iocPagination,
    iocSortBy,
    iocSortOrder,
    handleIocSort,
    stats,
    statsLoading,
    handleIOCSearch,
    aiIntel,
    selectedIocId: firstIocId,
    selectedIocIds: iocIds,
  }
}
