'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { Permission, SortOrder } from '@/enums'
import type { JobStatus, JobType } from '@/enums'
import { ALL_JOB_FILTER_VALUE } from '@/lib/constants/jobs'
import { isJobStatus, isJobType } from '@/lib/job.utils'
import { hasPermission } from '@/lib/permissions'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { useAuthStore } from '@/stores'
import { useCancelAllJobs, useCancelJob, useJobs, useJobStats, useRetryJob } from './useJobs'
import { usePagination } from './usePagination'

export function useJobsPage() {
  const t = useTranslations('jobs')
  const tErrors = useTranslations('errors')
  const permissions = useAuthStore(s => s.permissions)

  const [statusFilter, setStatusFilter] = useState<JobStatus | undefined>()
  const [typeFilter, setTypeFilter] = useState<JobType | undefined>()
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC)
  const pagination = usePagination({ initialPage: 1, initialLimit: 20 })

  const canManage = hasPermission(permissions, Permission.JOBS_MANAGE)
  const canCancelAll = hasPermission(permissions, Permission.JOBS_CANCEL_ALL)

  const handleSort = useCallback(
    (key: string, order: SortOrder) => {
      setSortBy(key)
      setSortOrder(order)
      pagination.setPage(1)
    },
    [pagination]
  )

  const params = useMemo(
    () => ({
      page: pagination.page,
      limit: pagination.limit,
      sortBy,
      sortOrder,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(typeFilter ? { type: typeFilter } : {}),
    }),
    [pagination.limit, pagination.page, sortBy, sortOrder, statusFilter, typeFilter]
  )

  const { data, isLoading, isFetching } = useJobs(params)
  const { data: stats } = useJobStats()
  const retryMutation = useRetryJob()
  const cancelMutation = useCancelJob()
  const cancelAllMutation = useCancelAllJobs()

  useEffect(() => {
    const paginationData = data?.pagination ?? data
    const total = (paginationData as Record<string, unknown> | undefined)?.['total']
    if (typeof total === 'number') {
      pagination.setTotal(total)
    }
  }, [data, pagination])

  const handleRetry = useCallback(
    (id: string) => {
      retryMutation.mutate(id, {
        onSuccess: () => {
          Toast.success(t('retrySuccess'))
        },
        onError: buildErrorToastHandler(tErrors),
      })
    },
    [retryMutation, t, tErrors]
  )

  const handleCancel = useCallback(
    (id: string) => {
      cancelMutation.mutate(id, {
        onSuccess: () => {
          Toast.success(t('cancelSuccess'))
        },
        onError: buildErrorToastHandler(tErrors),
      })
    },
    [cancelMutation, t, tErrors]
  )

  const handleCancelAll = useCallback(() => {
    cancelAllMutation.mutate(undefined, {
      onSuccess: result => {
        const count = (result as { data: { cancelled: number } })?.data?.cancelled ?? 0
        Toast.success(t('cancelAllSuccess', { count: String(count) }))
      },
      onError: buildErrorToastHandler(tErrors),
    })
  }, [cancelAllMutation, t, tErrors])

  const isMutating =
    retryMutation.isPending || cancelMutation.isPending || cancelAllMutation.isPending

  return {
    t,
    allFilterValue: ALL_JOB_FILTER_VALUE,
    pagination,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    data,
    stats,
    isLoading,
    isFetching,
    isMutating,
    canManage,
    canCancelAll,
    sortBy,
    sortOrder,
    handleSort,
    handleRetry,
    handleCancel,
    handleCancelAll,
    isJobStatus,
    isJobType,
  }
}
