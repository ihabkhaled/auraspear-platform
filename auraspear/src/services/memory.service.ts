import api from '@/lib/api'
import type {
  CreateMemoryInput,
  MemoryRetentionPolicy,
  MemoryStats,
  UpdateMemoryInput,
  UserMemory,
  UserMemoryListResponse,
} from '@/types'

/**
 * Extract the actual payload from a proxy response.
 * The proxy wraps non-wrapped responses as { data: T }.
 * For responses the backend already wraps with { data: ... },
 * the proxy passes through, so r.data IS the backend response directly.
 */
function extractData<T>(response: { data: unknown }): T {
  const body = response.data as Record<string, unknown>
  if (body !== null && typeof body === 'object' && 'data' in body) {
    return body['data'] as T
  }
  return body as T
}

export const memoryService = {
  list: (params?: { category?: string; search?: string; limit?: number; offset?: number }) =>
    api.get<UserMemoryListResponse>('/user-memory', { params }).then(r => r.data),

  create: (data: CreateMemoryInput) =>
    api.post('/user-memory', data).then(r => extractData<UserMemory>(r)),

  update: (id: string, data: UpdateMemoryInput) =>
    api.patch(`/user-memory/${id}`, data).then(r => extractData<UserMemory>(r)),

  delete: (id: string) => api.delete(`/user-memory/${id}`).then(r => extractData<void>(r)),

  deleteAll: () => api.delete('/user-memory').then(r => extractData<{ deleted: number }>(r)),

  /* ── Governance ────────────────────────────────────── */

  getStats: () => api.get('/user-memory/governance/stats').then(r => extractData<MemoryStats>(r)),

  listAll: (params?: Record<string, string | number>) =>
    api.get('/user-memory/governance/all', { params }).then(r => {
      // Backend returns { data: UserMemory[], total: number }
      // Proxy sees `data` key and passes through, so r.data IS { data: [...], total: N }
      const body = r.data as { data: UserMemory[]; total: number }
      return { data: Array.isArray(body.data) ? body.data : [], total: Number(body.total ?? 0) }
    }),

  exportMemories: (userId?: string) =>
    api
      .get('/user-memory/governance/export', {
        params: userId ? { userId } : {},
      })
      .then(r => {
        // Backend returns { data: UserMemory[] } — proxy passes through
        const body = r.data as { data: UserMemory[] }
        return Array.isArray(body.data) ? body.data : []
      }),

  getRetentionPolicy: () =>
    api
      .get('/user-memory/governance/retention')
      .then(r => extractData<MemoryRetentionPolicy | null>(r)),

  upsertRetentionPolicy: (data: { retentionDays: number; autoCleanup: boolean }) =>
    api
      .patch('/user-memory/governance/retention', data)
      .then(r => extractData<MemoryRetentionPolicy>(r)),

  runCleanup: () =>
    api.post('/user-memory/governance/cleanup').then(r => extractData<{ cleaned: number }>(r)),

  adminDeleteUserMemories: (userId: string) =>
    api
      .delete(`/user-memory/governance/user/${userId}`)
      .then(r => extractData<{ deleted: number }>(r)),
}
