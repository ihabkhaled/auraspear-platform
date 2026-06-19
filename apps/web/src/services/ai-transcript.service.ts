import api from '@/lib/api'
import type {
  AiAuditLogEntry,
  AiTranscriptMessage,
  AiTranscriptPolicy,
  AiTranscriptStats,
  AiTranscriptThread,
} from '@/types'

function extractData<T>(response: { data: unknown }): T {
  const body = response.data as Record<string, unknown>
  if (body !== null && typeof body === 'object' && 'data' in body) {
    return body['data'] as T
  }
  return body as T
}

export const aiTranscriptService = {
  getStats: () =>
    api.get('/ai-transcripts/stats').then(r => extractData<AiTranscriptStats>(r)),

  listThreads: (params?: Record<string, string | number>) =>
    api.get('/ai-transcripts/threads', { params }).then(r => {
      const body = r.data as { data: AiTranscriptThread[]; total: number }
      return { data: Array.isArray(body.data) ? body.data : [], total: Number(body.total ?? 0) }
    }),

  getThreadMessages: (threadId: string) =>
    api.get(`/ai-transcripts/threads/${threadId}/messages`).then(r => extractData<AiTranscriptMessage[]>(r)),

  listAuditLogs: (params?: Record<string, string | number>) =>
    api.get('/ai-transcripts/audit-logs', { params }).then(r => {
      const body = r.data as { data: AiAuditLogEntry[]; total: number }
      return { data: Array.isArray(body.data) ? body.data : [], total: Number(body.total ?? 0) }
    }),

  toggleLegalHold: (threadId: string, legalHold: boolean) =>
    api.post(`/ai-transcripts/threads/${threadId}/legal-hold`, { legalHold }).then(r => extractData<AiTranscriptThread>(r)),

  redactThread: (threadId: string) =>
    api.post(`/ai-transcripts/threads/${threadId}/redact`).then(r => extractData<{ redacted: number }>(r)),

  exportThread: (threadId: string) =>
    api.get(`/ai-transcripts/export/thread/${threadId}`).then(r => extractData<{ thread: AiTranscriptThread; messages: AiTranscriptMessage[] }>(r)),

  exportAuditLogs: (from?: string, to?: string) => {
    const params: Record<string, string> = {}
    if (from) params['from'] = from
    if (to) params['to'] = to
    return api.get('/ai-transcripts/export/audit-logs', { params }).then(r => extractData<AiAuditLogEntry[]>(r))
  },

  getPolicy: () =>
    api.get('/ai-transcripts/policy').then(r => extractData<AiTranscriptPolicy | null>(r)),

  upsertPolicy: (data: {
    chatRetentionDays: number
    auditRetentionDays: number
    autoRedactPii: boolean
    requireLegalHold: boolean
  }) => api.patch('/ai-transcripts/policy', data).then(r => extractData<AiTranscriptPolicy>(r)),

  runCleanup: () =>
    api.post('/ai-transcripts/cleanup').then(r => extractData<{ chats: number; audits: number }>(r)),
}
