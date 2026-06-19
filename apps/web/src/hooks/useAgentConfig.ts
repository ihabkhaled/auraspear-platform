'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { agentConfigService } from '@/services'
import { useTenantStore } from '@/stores'
import type { ApiResponse, TenantAgentConfig, UpdateAgentConfigInput } from '@/types'

export function useAgentConfigs() {
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useQuery({
    queryKey: ['agent-config', 'agents', tenantId],
    queryFn: () => agentConfigService.getAgentConfigs(),
  })
}

export function useAgentConfig(agentId: string | null) {
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useQuery({
    queryKey: ['agent-config', 'agents', agentId, tenantId],
    queryFn: () => agentConfigService.getAgentConfig(agentId ?? ''),
    enabled: Boolean(agentId),
  })
}

export function useUpdateAgentConfig() {
  const queryClient = useQueryClient()
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: ({ agentId, data }: { agentId: string; data: UpdateAgentConfigInput }) =>
      agentConfigService.updateAgentConfig(agentId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['agent-config', 'agents', tenantId] })
    },
  })
}

export function useToggleAgent() {
  const queryClient = useQueryClient()
  const tenantId = useTenantStore(s => s.currentTenantId)
  const agentsKey = ['agent-config', 'agents', tenantId]
  const statsKey = ['orchestrator-stats', tenantId]

  return useMutation({
    mutationFn: ({ agentId, enabled }: { agentId: string; enabled: boolean }) =>
      agentConfigService.toggleAgent(agentId, enabled),
    onMutate: async ({ agentId, enabled }) => {
      await queryClient.cancelQueries({ queryKey: agentsKey })
      const previous = queryClient.getQueryData<ApiResponse<TenantAgentConfig[]>>(agentsKey)

      if (previous) {
        queryClient.setQueryData<ApiResponse<TenantAgentConfig[]>>(agentsKey, {
          ...previous,
          data: previous.data.map(agent =>
            agent.agentId === agentId ? { ...agent, isEnabled: enabled } : agent
          ),
        })
      }

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(agentsKey, context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: agentsKey })
      void queryClient.invalidateQueries({ queryKey: statsKey })
    },
  })
}

export function useResetUsage() {
  const queryClient = useQueryClient()
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: ({ agentId, period }: { agentId: string; period: string }) =>
      agentConfigService.resetUsage(agentId, period),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['agent-config', 'agents', tenantId] })
    },
  })
}
