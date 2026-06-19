'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { agentConfigService } from '@/services'
import { useTenantStore } from '@/stores'
import type { CreateAiPromptInput, UpdateAiPromptInput } from '@/types'

export function useAiPrompts(enabled = true) {
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useQuery({
    queryKey: ['ai-prompts', tenantId],
    queryFn: () => agentConfigService.getPrompts(),
    enabled,
  })
}

export function useCreateAiPrompt() {
  const queryClient = useQueryClient()
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: (data: CreateAiPromptInput) => agentConfigService.createPrompt(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-prompts', tenantId] })
    },
  })
}

export function useUpdateAiPrompt() {
  const queryClient = useQueryClient()
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAiPromptInput }) =>
      agentConfigService.updatePrompt(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-prompts', tenantId] })
    },
  })
}

export function useActivateAiPrompt() {
  const queryClient = useQueryClient()
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: (id: string) => agentConfigService.activatePrompt(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-prompts', tenantId] })
    },
  })
}

export function useDeleteAiPrompt() {
  const queryClient = useQueryClient()
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: (id: string) => agentConfigService.deletePrompt(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-prompts', tenantId] })
    },
  })
}
