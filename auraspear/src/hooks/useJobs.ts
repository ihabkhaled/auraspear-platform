import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Permission } from '@/enums'
import { requirePermission } from '@/lib/permissions'
import { jobService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { JobSearchParams } from '@/types'

export function useJobs(params?: JobSearchParams) {
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useQuery({
    queryKey: ['jobs', tenantId, params],
    queryFn: () => jobService.getJobs(params),
    placeholderData: keepPreviousData,
  })
}

export function useJobStats() {
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useQuery({
    queryKey: ['jobs', tenantId, 'stats'],
    queryFn: () => jobService.getJobStats(),
  })
}

export function useRetryJob() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: (id: string) => {
      requirePermission(permissions, Permission.JOBS_MANAGE)
      return jobService.retryJob(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['jobs', tenantId] })
    },
  })
}

export function useCancelJob() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: (id: string) => {
      requirePermission(permissions, Permission.JOBS_MANAGE)
      return jobService.cancelJob(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['jobs', tenantId] })
    },
  })
}

export function useCancelAllJobs() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: () => {
      requirePermission(permissions, Permission.JOBS_CANCEL_ALL)
      return jobService.cancelAllJobs()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['jobs', tenantId] })
    },
  })
}
