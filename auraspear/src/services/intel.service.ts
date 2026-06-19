import api from '@/lib/api'
import type {
  AiResponse,
  ApiResponse,
  IntelStats,
  IOCCorrelation,
  MISPEvent,
  MISPSearchParams,
} from '@/types'

export const intelService = {
  getStats: () => api.get<ApiResponse<IntelStats>>('/intel/stats').then(r => r.data.data),

  getMISPEvents: (params?: MISPSearchParams) =>
    api.get<ApiResponse<MISPEvent[]>>('/intel/misp-events', { params }).then(r => r.data),

  searchIOC: (
    query: string,
    type: string,
    page = 1,
    limit = 10,
    sortBy?: string,
    sortOrder?: string,
    source?: string
  ) =>
    api
      .get<ApiResponse<IOCCorrelation[]>>('/intel/ioc-search', {
        params: { value: query, type, source, page, limit, sortBy, sortOrder },
      })
      .then(r => r.data),

  aiEnrichIoc: (iocId: string, connector?: string) => {
    if (!iocId) {
      return Promise.reject(new Error('IOC ID is required for enrichment'))
    }
    return api
      .post<ApiResponse<AiResponse>>(`/intel/${iocId}/ai/enrich`, { connector })
      .then(r => r.data.data)
  },

  aiDraftAdvisory: (iocIds: string[], connector?: string) => {
    if (iocIds.length === 0) {
      return Promise.reject(new Error('At least one IOC ID is required for advisory'))
    }
    return api
      .post<ApiResponse<AiResponse>>('/intel/ai/advisory', { iocIds, connector })
      .then(r => r.data.data)
  },
}
