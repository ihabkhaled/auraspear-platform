'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { agentConfigService } from '@/services'
import { useTenantStore } from '@/stores'
import type { AiAgentSchedule, ApiResponse, UpdateScheduleInput } from '@/types'

export function useAiSchedules(enabled = true) {
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useQuery({
    queryKey: ['ai-schedules', tenantId],
    queryFn: () => agentConfigService.getSchedules(),
    enabled,
  })
}

export function useToggleSchedule() {
  const queryClient = useQueryClient()
  const tenantId = useTenantStore(s => s.currentTenantId)
  const key = ['ai-schedules', tenantId]

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      agentConfigService.toggleSchedule(id, enabled),
    onMutate: async ({ id, enabled }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<ApiResponse<AiAgentSchedule[]>>(key)
      if (previous) {
        queryClient.setQueryData<ApiResponse<AiAgentSchedule[]>>(key, {
          ...previous,
          data: previous.data.map(s => (s.id === id ? { ...s, isEnabled: enabled } : s)),
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

export function usePauseSchedule() {
  const queryClient = useQueryClient()
  const tenantId = useTenantStore(s => s.currentTenantId)
  const key = ['ai-schedules', tenantId]

  return useMutation({
    mutationFn: ({ id, paused }: { id: string; paused: boolean }) =>
      agentConfigService.pauseSchedule(id, paused),
    onMutate: async ({ id, paused }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<ApiResponse<AiAgentSchedule[]>>(key)
      if (previous) {
        queryClient.setQueryData<ApiResponse<AiAgentSchedule[]>>(key, {
          ...previous,
          data: previous.data.map(s => (s.id === id ? { ...s, isPaused: paused } : s)),
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

export function useRunScheduleNow() {
  const queryClient = useQueryClient()
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: (id: string) => agentConfigService.runScheduleNow(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-schedules', tenantId] })
    },
  })
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient()
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateScheduleInput }) =>
      agentConfigService.updateSchedule(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-schedules', tenantId] })
    },
  })
}

export function useResetSchedule() {
  const queryClient = useQueryClient()
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: (id: string) => agentConfigService.resetSchedule(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-schedules', tenantId] })
    },
  })
}
