import { useQuery } from '@tanstack/react-query'
import type { SortOrder } from '@/enums'
import { intelService } from '@/services'
import { useTenantStore } from '@/stores'
import type { MISPSearchParams } from '@/types'

export function useIntelStats() {
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useQuery({
    queryKey: ['intel', tenantId, 'stats'],
    queryFn: () => intelService.getStats(),
  })
}

export function useMISPEvents(params?: MISPSearchParams) {
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useQuery({
    queryKey: ['intel', tenantId, 'misp', params],
    queryFn: () => intelService.getMISPEvents(params),
  })
}

export function useIOCSearch(
  query: string,
  type: string,
  page = 1,
  limit = 10,
  sortBy?: string,
  sortOrder?: SortOrder,
  source?: string
) {
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useQuery({
    queryKey: ['intel', tenantId, 'ioc', query, type, source, page, limit, sortBy, sortOrder],
    queryFn: () => intelService.searchIOC(query, type, page, limit, sortBy, sortOrder, source),
  })
}
