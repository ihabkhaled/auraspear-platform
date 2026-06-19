'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Permission } from '@/enums'
import { getErrorKey } from '@/lib/api-error'
import { hasPermission } from '@/lib/permissions'
import { agentConfigService, aiSimulationService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { AiSimulation, AiSimulationStats, ApiResponse, TenantAgentConfig } from '@/types'

export function useAiSimulations() {
  const t = useTranslations('aiSimulations')
  const tErrors = useTranslations('errors')
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  const queryClient = useQueryClient()

  const canView = hasPermission(permissions, Permission.AI_SIMULATION_VIEW)
  const canManage = hasPermission(permissions, Permission.AI_SIMULATION_MANAGE)

  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newAgentId, setNewAgentId] = useState('')

  const agentsQuery = useQuery<ApiResponse<TenantAgentConfig[]>>({
    queryKey: ['agent-config', 'agents', tenantId],
    queryFn: () => agentConfigService.getAgentConfigs(),
    staleTime: 60_000,
  })
  const agents = Array.isArray(agentsQuery.data?.data) ? agentsQuery.data.data : []

  const simulationsQuery = useQuery<AiSimulation[]>({
    queryKey: ['ai-simulations', tenantId],
    queryFn: () => aiSimulationService.list(),
    enabled: canView,
    staleTime: 30_000,
  })

  const statsQuery = useQuery<AiSimulationStats>({
    queryKey: ['ai-simulation-stats', tenantId],
    queryFn: () => aiSimulationService.getStats(),
    enabled: canView,
    staleTime: 30_000,
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; agentId: string; datasetJson: unknown }) =>
      aiSimulationService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-simulations', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['ai-simulation-stats', tenantId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => aiSimulationService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-simulations', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['ai-simulation-stats', tenantId] })
    },
  })

  const simulations = simulationsQuery.data ?? []
  const stats = statsQuery.data ?? null

  const getErrorMessage = (error: unknown): string => {
    const key = getErrorKey(error)
    return tErrors(key)
  }

  function handleCreate() {
    if (!newName.trim() || !newAgentId.trim()) return
    createMutation.mutate(
      (() => {
        const payload: { name: string; description?: string; agentId: string; datasetJson: unknown } = {
          name: newName.trim(),
          agentId: newAgentId.trim(),
          datasetJson: [],
        }
        const desc = newDesc.trim()
        if (desc.length > 0) payload.description = desc
        return payload
      })(),
      {
        onSuccess: () => {
          setNewName('')
          setNewDesc('')
          setNewAgentId('')
          setShowCreate(false)
        },
      }
    )
  }

  return {
    t,
    canView,
    canManage,
    agents,
    simulations,
    stats,
    isLoading: simulationsQuery.isLoading || statsQuery.isLoading,
    isFetching: simulationsQuery.isFetching,
    createSimulation: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    deleteSimulation: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    getErrorMessage,
    showCreate,
    setShowCreate,
    newName,
    setNewName,
    newDesc,
    setNewDesc,
    newAgentId,
    setNewAgentId,
    handleCreate,
  }
}
