import api from '@/lib/api'
import type { SearchableModule, SemanticSearchResult } from '@/types'

function extractData<T>(response: { data: unknown }): T {
  const body = response.data as Record<string, unknown>
  if (body !== null && typeof body === 'object' && 'data' in body) {
    return body['data'] as T
  }
  return body as T
}

export const aiSearchService = {
  search: (query: string, modules?: string[], limit?: number) =>
    api
      .get('/ai-search', {
        params: {
          query,
          ...(modules && modules.length > 0 ? { modules: modules.join(',') } : {}),
          ...(limit ? { limit: String(limit) } : {}),
        },
      })
      .then(r => extractData<SemanticSearchResult[]>(r)),

  getModules: () =>
    api.get('/ai-search/modules').then(r => extractData<SearchableModule[]>(r)),
}
