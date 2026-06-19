import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Permission } from '@/enums'
import { requirePermission } from '@/lib/permissions'
import { llmConnectorService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { CreateLlmConnectorInput, UpdateLlmConnectorInput } from '@/types'

export function useLlmConnectors() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['llm-connectors', tenantId],
    queryFn: () => llmConnectorService.getAll(),
    placeholderData: keepPreviousData,
  })
}

export function useCreateLlmConnector() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: (data: CreateLlmConnectorInput) => {
      requirePermission(permissions, Permission.LLM_CONNECTORS_CREATE)
      return llmConnectorService.create(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['llm-connectors', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['ai-connectors-available', tenantId] })
    },
  })
}

export function useUpdateLlmConnector() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLlmConnectorInput }) => {
      requirePermission(permissions, Permission.LLM_CONNECTORS_UPDATE)
      return llmConnectorService.update(id, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['llm-connectors', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['ai-connectors-available', tenantId] })
    },
  })
}

export function useDeleteLlmConnector() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: (id: string) => {
      requirePermission(permissions, Permission.LLM_CONNECTORS_DELETE)
      return llmConnectorService.delete(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['llm-connectors', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['ai-connectors-available', tenantId] })
    },
  })
}

export function useTestLlmConnector() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: (id: string) => {
      requirePermission(permissions, Permission.LLM_CONNECTORS_TEST)
      return llmConnectorService.test(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['llm-connectors', tenantId] })
    },
  })
}

export function useToggleLlmConnector() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: (id: string) => {
      requirePermission(permissions, Permission.LLM_CONNECTORS_UPDATE)
      return llmConnectorService.toggle(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['llm-connectors', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['ai-connectors-available', tenantId] })
    },
  })
}
