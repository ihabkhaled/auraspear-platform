import api from '@/lib/api'
import type {
  ApiResponse,
  CaseCycle,
  CaseCycleDetail,
  CaseCycleSearchParams,
  CloseCaseCycleInput,
  CreateCaseCycleInput,
} from '@/types'

export const caseCycleService = {
  getCycles: (params?: CaseCycleSearchParams) =>
    api.get<ApiResponse<CaseCycle[]>>('/case-cycles', { params }).then(r => r.data),

  getActiveCycle: () =>
    api.get<{ data: CaseCycle | null }>('/case-cycles/active').then(r => r.data),

  getCycle: (id: string) =>
    api.get<{ data: CaseCycleDetail }>(`/case-cycles/${id}`).then(r => r.data),

  createCycle: (data: CreateCaseCycleInput) =>
    api.post<{ data: CaseCycle }>('/case-cycles', data).then(r => r.data),

  closeCycle: (id: string, data: CloseCaseCycleInput) =>
    api.patch<{ data: CaseCycle }>(`/case-cycles/${id}/close`, data).then(r => r.data),

  updateCycle: (id: string, data: Partial<CreateCaseCycleInput>) =>
    api.patch<{ data: CaseCycle }>(`/case-cycles/${id}`, data).then(r => r.data.data),

  activateCycle: (id: string) =>
    api.patch<{ data: CaseCycle }>(`/case-cycles/${id}/activate`).then(r => r.data.data),

  deleteCycle: (id: string) =>
    api.delete<{ deleted: boolean }>(`/case-cycles/${id}`).then(r => r.data),

  getOrphanedStats: () =>
    api
      .get<{
        data: { caseCount: number; openCount: number; closedCount: number }
      }>('/case-cycles/orphaned-stats')
      .then(r => r.data),
}
