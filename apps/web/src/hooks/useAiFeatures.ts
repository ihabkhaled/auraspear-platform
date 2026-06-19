'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { agentConfigService } from '@/services'
import { useTenantStore } from '@/stores'
import type { AiFeatureConfig, ApiResponse, UpdateAiFeatureConfigInput } from '@/types'

export function useAiFeatures(enabled = true) {
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useQuery({
    queryKey: ['ai-features', tenantId],
    queryFn: () => agentConfigService.getFeatures(),
    enabled,
  })
}

export function useUpdateAiFeature() {
  const queryClient = useQueryClient()
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: ({ featureKey, data }: { featureKey: string; data: UpdateAiFeatureConfigInput }) =>
      agentConfigService.updateFeature(featureKey, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-features', tenantId] })
    },
  })
}

export function useToggleAiFeature() {
  const queryClient = useQueryClient()
  const tenantId = useTenantStore(s => s.currentTenantId)
  const key = ['ai-features', tenantId]

  return useMutation({
    mutationFn: ({ featureKey, enabled }: { featureKey: string; enabled: boolean }) =>
      agentConfigService.updateFeature(featureKey, { enabled }),
    onMutate: async ({ featureKey, enabled }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<ApiResponse<AiFeatureConfig[]>>(key)
      if (previous) {
        queryClient.setQueryData<ApiResponse<AiFeatureConfig[]>>(key, {
          ...previous,
          data: previous.data.map(f => (f.featureKey === featureKey ? { ...f, enabled } : f)),
        })
      }
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key })
    },
  })
}
