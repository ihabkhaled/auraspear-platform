'use client'

import { useState, useMemo, useCallback } from 'react'
import type { UsePaginationOptions, UsePaginationReturn } from '@/types'

export function usePagination(options?: UsePaginationOptions): UsePaginationReturn {
  const [page, setPage] = useState(options?.initialPage ?? 1)
  const [limit, setLimit] = useState(options?.initialLimit ?? 10)
  const [total, setTotal] = useState(0)

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit])

  const hasNext = useMemo(() => page < totalPages, [page, totalPages])
  const hasPrev = useMemo(() => page > 1, [page])

  const handleSetLimit = useCallback((newLimit: number) => {
    setLimit(newLimit)
    setPage(1)
  }, [])

  const resetPage = useCallback(() => {
    setPage(1)
  }, [])

  return {
    page,
    setPage,
    resetPage,
    limit,
    setLimit: handleSetLimit,
    total,
    setTotal,
    totalPages,
    hasNext,
    hasPrev,
  }
}
