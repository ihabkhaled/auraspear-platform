import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { adminService } from '@/services'
import { useTenantStore } from '@/stores'
import type { AppLogSearchParams } from '@/types'

export function useAppLogs(params?: AppLogSearchParams) {
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useQuery({
    queryKey: ['app-logs', tenantId, params],
    queryFn: () => adminService.getAppLogs(params),
    placeholderData: keepPreviousData,
  })
}

export function useAppLogDetail(id: string | null) {
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useQuery({
    queryKey: ['app-log', tenantId, id],
    queryFn: () => adminService.getAppLogById(id as string),
    enabled: Boolean(id),
  })
}
