'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { memoryService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { MemoryRetentionPolicy, MemoryStats, UserMemory } from '@/types'

export function useAiMemoryGovernance() {
  const t = useTranslations('memoryGovernance')
  const tErrors = useTranslations('errors')
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  const queryClient = useQueryClient()

  const canAdmin = hasPermission(permissions, Permission.AI_MEMORY_ADMIN)
  const canExport = hasPermission(permissions, Permission.AI_MEMORY_EXPORT)

  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [page, setPage] = useState(1)
  const limit = 25

  const statsQuery = useQuery<MemoryStats>({
    queryKey: ['memory-governance-stats', tenantId],
    queryFn: () => memoryService.getStats(),
    enabled: canAdmin,
    staleTime: 30_000,
  })

  const memoriesQuery = useQuery<{ data: UserMemory[]; total: number }>({
    queryKey: ['memory-governance-all', tenantId, searchQuery, categoryFilter, userFilter, page],
    queryFn: () => {
      const params: Record<string, string | number> = {
        limit,
        offset: (page - 1) * limit,
      }
      if (searchQuery) params['search'] = searchQuery
      if (categoryFilter) params['category'] = categoryFilter
      if (userFilter) params['userId'] = userFilter
      return memoryService.listAll(params)
    },
    enabled: canAdmin,
    staleTime: 15_000,
  })

  const retentionQuery = useQuery<MemoryRetentionPolicy | null>({
    queryKey: ['memory-governance-retention', tenantId],
    queryFn: () => memoryService.getRetentionPolicy(),
    enabled: canAdmin,
    staleTime: 60_000,
  })

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['memory-governance-stats', tenantId] })
    void queryClient.invalidateQueries({ queryKey: ['memory-governance-all', tenantId] })
  }

  const retentionMutation = useMutation({
    mutationFn: (data: { retentionDays: number; autoCleanup: boolean }) =>
      memoryService.upsertRetentionPolicy(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['memory-governance-retention', tenantId] })
      Toast.success(t('retention.saved'))
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const cleanupMutation = useMutation({
    mutationFn: () => memoryService.runCleanup(),
    onSuccess: result => {
      invalidateAll()
      Toast.success(`${t('retention.cleanupDone')}: ${String(result.cleaned)}`)
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const deleteUserMemoriesMutation = useMutation({
    mutationFn: (userId: string) => memoryService.adminDeleteUserMemories(userId),
    onSuccess: () => {
      invalidateAll()
      Toast.success(t('userMemoriesDeleted'))
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const stats = statsQuery.data ?? null
  const memories = Array.isArray(memoriesQuery.data?.data) ? memoriesQuery.data.data : []
  const totalMemories = Number(memoriesQuery.data?.total ?? 0)
  const retention = retentionQuery.data ?? null

  function handleExport() {
    memoryService
      .exportMemories(userFilter.length > 0 ? userFilter : undefined)
      .then(exportData => {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `memories-export-${tenantId ?? 'tenant'}.json`
        a.click()
        URL.revokeObjectURL(url)
        Toast.success(t('exportDone'))
      })
      .catch(buildErrorToastHandler(tErrors))
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value)
    setPage(1)
  }

  function handleCategoryChange(value: string) {
    setCategoryFilter(value)
    setPage(1)
  }

  function handleUserChange(value: string) {
    setUserFilter(value)
    setPage(1)
  }

  return {
    t,
    canAdmin,
    canExport,
    stats,
    memories,
    totalMemories,
    retention,
    isLoading: statsQuery.isLoading || memoriesQuery.isLoading,
    isFetching: memoriesQuery.isFetching,
    searchQuery,
    categoryFilter,
    userFilter,
    page,
    limit,
    setPage,
    handleSearchChange,
    handleCategoryChange,
    handleUserChange,
    handleExport,
    saveRetention: retentionMutation.mutate,
    isSavingRetention: retentionMutation.isPending,
    runCleanup: () => cleanupMutation.mutate(),
    isCleaningUp: cleanupMutation.isPending,
    deleteUserMemories: deleteUserMemoriesMutation.mutate,
    isDeletingUser: deleteUserMemoriesMutation.isPending,
  }
}
