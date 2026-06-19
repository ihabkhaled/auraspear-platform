'use client'

import { useCallback, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { memoryService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { UserMemory } from '@/types'

export function useMemorySettings() {
  const t = useTranslations('memory')
  const tErrors = useTranslations('errors')
  const tenantId = useTenantStore(s => s.currentTenantId)
  const permissions = useAuthStore(s => s.permissions)
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [editingMemory, setEditingMemory] = useState<UserMemory | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const canView = hasPermission(permissions, Permission.AI_MEMORY_VIEW)
  const canEdit = hasPermission(permissions, Permission.AI_MEMORY_EDIT)

  const memoriesQuery = useQuery({
    queryKey: ['user-memories', tenantId, searchQuery, categoryFilter],
    queryFn: () => {
      const params: { search?: string; category?: string; limit: number } = { limit: 100 }
      if (searchQuery) params.search = searchQuery
      if (categoryFilter) params.category = categoryFilter
      return memoryService.list(params)
    },
    enabled: canView,
  })

  const memories = memoriesQuery.data?.data ?? []
  const totalMemories = memoriesQuery.data?.total ?? 0

  const createMutation = useMutation({
    mutationFn: (data: { content: string; category?: string }) => memoryService.create(data),
    onSuccess: () => {
      Toast.success(t('created'))
      setCreateDialogOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['user-memories', tenantId] })
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { content: string; category?: string } }) =>
      memoryService.update(id, data),
    onSuccess: () => {
      Toast.success(t('updated'))
      setEditingMemory(null)
      void queryClient.invalidateQueries({ queryKey: ['user-memories', tenantId] })
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => memoryService.delete(id),
    onSuccess: () => {
      Toast.success(t('deleted'))
      void queryClient.invalidateQueries({ queryKey: ['user-memories', tenantId] })
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const deleteAllMutation = useMutation({
    mutationFn: () => memoryService.deleteAll(),
    onSuccess: () => {
      Toast.success(t('allDeleted'))
      void queryClient.invalidateQueries({ queryKey: ['user-memories', tenantId] })
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
  }, [])

  const handleCategoryChange = useCallback((value: string) => {
    setCategoryFilter(value === 'all' ? '' : value)
  }, [])

  return {
    t,
    canView,
    canEdit,
    memories,
    totalMemories,
    isLoading: memoriesQuery.isLoading,
    isFetching: memoriesQuery.isFetching,
    searchQuery,
    handleSearchChange,
    categoryFilter,
    handleCategoryChange,
    editingMemory,
    setEditingMemory,
    createDialogOpen,
    setCreateDialogOpen,
    createMemory: createMutation.mutate,
    isCreating: createMutation.isPending,
    updateMemory: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    deleteMemory: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    deleteAllMemories: deleteAllMutation.mutate,
    isDeletingAll: deleteAllMutation.isPending,
  }
}
