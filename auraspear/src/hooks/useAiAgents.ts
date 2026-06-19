import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Permission } from '@/enums'
import { requirePermission } from '@/lib/permissions'
import { aiAgentService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type {
  AiAgentSearchParams,
  AiAgentSessionSearchParams,
  CreateAgentToolMutationInput,
  DeleteAgentToolMutationInput,
  RunAiAgentMutationInput,
  UpdateAiAgentMutationInput,
  UpdateAiAgentSoulMutationInput,
} from '@/types'

export function useAiAgents(params?: AiAgentSearchParams) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['ai-agents', tenantId, params],
    queryFn: () => aiAgentService.getAgents(params),
    placeholderData: keepPreviousData,
  })
}

export function useAiAgentStats() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['ai-agents', 'stats', tenantId],
    queryFn: () => aiAgentService.getAgentStats(),
  })
}

export function useAiAgent(id: string) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['ai-agents', id, tenantId],
    queryFn: () => aiAgentService.getAgentById(id),
    enabled: id.length > 0,
  })
}

export function useAiAgentSessions(agentId: string, params?: AiAgentSessionSearchParams) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['ai-agents', agentId, 'sessions', tenantId, params],
    queryFn: () => aiAgentService.getAgentSessions(agentId, params),
    enabled: agentId.length > 0,
  })
}

export function useUpdateSoul() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: ({ id, soulMd }: UpdateAiAgentSoulMutationInput) => {
      requirePermission(permissions, Permission.AI_AGENTS_UPDATE)
      return aiAgentService.updateSoul(id, { soulMd })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-agents', tenantId] })
    },
  })
}

export function useStartAgent() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: (id: string) => {
      requirePermission(permissions, Permission.AI_AGENTS_UPDATE)
      return aiAgentService.startAgent(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-agents', tenantId] })
    },
  })
}

export function useStopAgent() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: (id: string) => {
      requirePermission(permissions, Permission.AI_AGENTS_UPDATE)
      return aiAgentService.stopAgent(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-agents', tenantId] })
    },
  })
}

export function useCreateAiAgent() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      requirePermission(permissions, Permission.AI_AGENTS_CREATE)
      return aiAgentService.createAgent(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-agents', tenantId] })
    },
  })
}

export function useUpdateAiAgent() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: ({ id, data }: UpdateAiAgentMutationInput) => {
      requirePermission(permissions, Permission.AI_AGENTS_UPDATE)
      return aiAgentService.updateAgent(id, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-agents', tenantId] })
    },
  })
}

export function useDeleteAiAgent() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: (id: string) => {
      requirePermission(permissions, Permission.AI_AGENTS_DELETE)
      return aiAgentService.deleteAgent(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-agents', tenantId] })
    },
  })
}

export function useCreateAgentTool() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: ({ agentId, data }: CreateAgentToolMutationInput) => {
      requirePermission(permissions, Permission.AI_AGENTS_UPDATE)
      return aiAgentService.createTool(agentId, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-agents', tenantId] })
    },
  })
}

export function useDeleteAgentTool() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: ({ agentId, toolId }: DeleteAgentToolMutationInput) => {
      requirePermission(permissions, Permission.AI_AGENTS_UPDATE)
      return aiAgentService.deleteTool(agentId, toolId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-agents', tenantId] })
    },
  })
}

export function useRunAiAgent() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: ({ id, prompt, connector }: RunAiAgentMutationInput) => {
      requirePermission(permissions, Permission.AI_AGENTS_EXECUTE)
      return aiAgentService.runAgent(id, { prompt, connector })
    },
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['ai-agents', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['ai-agents', id, 'sessions', tenantId] })
    },
  })
}
