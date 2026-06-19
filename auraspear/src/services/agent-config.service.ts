import api from '@/lib/api'
import type {
  AgentExecutionHistoryItem,
  AiAgentSchedule,
  AiChatMessage,
  AiChatThread,
  AiExecutionFinding,
  AiFeatureConfig,
  AiFindingsStats,
  AiJobRunSummary,
  AiPromptTemplate,
  ApiResponse,
  ApprovalRequest,
  CreateAiPromptInput,
  CreateOsintSourceInput,
  DispatchAgentTaskInput,
  OrchestratorStats,
  OsintEnrichInput,
  OsintEnrichmentResult,
  OsintQueryInput,
  OsintQueryResult,
  OsintSourceConfig,
  ResolveApprovalInput,
  TenantAgentConfig,
  UpdateAgentConfigInput,
  UpdateAiFeatureConfigInput,
  UpdateAiPromptInput,
  UpdateOsintSourceInput,
  UpdateScheduleInput,
} from '@/types'

export const agentConfigService = {
  getAgentConfigs: () =>
    api.get<ApiResponse<TenantAgentConfig[]>>('/agent-config/agents').then(r => r.data),

  getAgentConfig: (agentId: string) =>
    api.get<ApiResponse<TenantAgentConfig>>(`/agent-config/agents/${agentId}`).then(r => r.data),

  updateAgentConfig: (agentId: string, data: UpdateAgentConfigInput) =>
    api
      .patch<ApiResponse<TenantAgentConfig>>(`/agent-config/agents/${agentId}`, data)
      .then(r => r.data),

  toggleAgent: (agentId: string, enabled: boolean) =>
    api
      .post<ApiResponse<TenantAgentConfig>>(`/agent-config/agents/${agentId}/toggle`, {
        enabled,
      })
      .then(r => r.data),

  resetUsage: (agentId: string, period: string) =>
    api
      .post<ApiResponse<TenantAgentConfig>>(`/agent-config/agents/${agentId}/reset-usage/${period}`)
      .then(r => r.data),

  bulkToggleAgents: (enabled: boolean) =>
    api
      .post<ApiResponse<{ updated: number }>>('/agent-config/agents/bulk-toggle', { enabled })
      .then(r => r.data),

  bulkToggleOsintSources: (enabled: boolean) =>
    api
      .post<
        ApiResponse<{ updated: number }>
      >('/agent-config/osint-sources/bulk-toggle', { enabled })
      .then(r => r.data),

  bulkToggleFeatures: (enabled: boolean) =>
    api
      .post<ApiResponse<{ updated: number }>>('/ai-features/bulk-toggle', { enabled })
      .then(r => r.data),

  bulkToggleSchedules: (enabled: boolean) =>
    api
      .post<ApiResponse<{ updated: number }>>('/ai/schedules/bulk-toggle', { enabled })
      .then(r => r.data),

  getOsintSources: () =>
    api.get<ApiResponse<OsintSourceConfig[]>>('/agent-config/osint-sources').then(r => r.data),

  createOsintSource: (data: CreateOsintSourceInput) =>
    api.post<ApiResponse<OsintSourceConfig>>('/agent-config/osint-sources', data).then(r => r.data),

  updateOsintSource: (id: string, data: UpdateOsintSourceInput) =>
    api
      .patch<ApiResponse<OsintSourceConfig>>(`/agent-config/osint-sources/${id}`, data)
      .then(r => r.data),

  deleteOsintSource: (id: string) =>
    api
      .delete<ApiResponse<{ deleted: boolean }>>(`/agent-config/osint-sources/${id}`)
      .then(r => r.data),

  testOsintSource: (id: string) =>
    api
      .post<
        ApiResponse<{ success: boolean; message: string }>
      >(`/agent-config/osint-sources/${id}/test`)
      .then(r => r.data),

  getApprovals: (status?: string) =>
    api
      .get<ApiResponse<ApprovalRequest[]>>('/agent-config/approvals', {
        params: status ? { status } : undefined,
      })
      .then(r => r.data),

  resolveApproval: (id: string, data: ResolveApprovalInput) =>
    api
      .post<ApiResponse<ApprovalRequest>>(`/agent-config/approvals/${id}/resolve`, data)
      .then(r => r.data),

  queryOsintSource: (input: OsintQueryInput) =>
    api.post<ApiResponse<OsintQueryResult>>('/osint/query', input).then(r => r.data),

  enrichIoc: (input: OsintEnrichInput) =>
    api.post<ApiResponse<OsintEnrichmentResult>>('/osint/enrich', input).then(r => r.data),

  uploadFileForScan: (sourceId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('sourceId', sourceId)
    return api
      .post<OsintQueryResult>('/osint/upload-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(r => r.data)
  },

  fetchVtAnalysis: (analysisUrl: string) =>
    api.post<ApiResponse<unknown>>('/osint/fetch-analysis', { analysisUrl }).then(r => r.data),

  // Prompt Registry
  getPrompts: () => api.get<ApiResponse<AiPromptTemplate[]>>('/ai-prompts').then(r => r.data),

  getPrompt: (id: string) =>
    api.get<ApiResponse<AiPromptTemplate>>(`/ai-prompts/${id}`).then(r => r.data),

  createPrompt: (data: CreateAiPromptInput) =>
    api.post<ApiResponse<AiPromptTemplate>>('/ai-prompts', data).then(r => r.data),

  updatePrompt: (id: string, data: UpdateAiPromptInput) =>
    api.patch<ApiResponse<AiPromptTemplate>>(`/ai-prompts/${id}`, data).then(r => r.data),

  activatePrompt: (id: string) =>
    api.post<ApiResponse<AiPromptTemplate>>(`/ai-prompts/${id}/activate`).then(r => r.data),

  deletePrompt: (id: string) =>
    api.delete<ApiResponse<{ deleted: boolean }>>(`/ai-prompts/${id}`).then(r => r.data),

  // Feature Catalog
  getFeatures: () => api.get<ApiResponse<AiFeatureConfig[]>>('/ai-features').then(r => r.data),

  getFeature: (featureKey: string) =>
    api.get<ApiResponse<AiFeatureConfig>>(`/ai-features/${featureKey}`).then(r => r.data),

  updateFeature: (featureKey: string, data: UpdateAiFeatureConfigInput) =>
    api.patch<ApiResponse<AiFeatureConfig>>(`/ai-features/${featureKey}`, data).then(r => r.data),

  // Orchestrator
  dispatchAgentTask: (agentId: string, payload: DispatchAgentTaskInput) =>
    api
      .post<
        ApiResponse<Record<string, unknown>>
      >(`/agent-config/agents/${agentId}/dispatch`, payload)
      .then(r => r.data),

  getAgentExecutionHistory: (agentId: string, params?: Record<string, unknown>) =>
    api
      .get<
        ApiResponse<AgentExecutionHistoryItem[]>
      >(`/agent-config/agents/${agentId}/history`, { params })
      .then(r => r.data),

  getOrchestratorStats: () =>
    api.get<ApiResponse<OrchestratorStats>>('/agent-config/orchestrator/stats').then(r => r.data),

  // AI Findings
  getFindings: (params?: {
    sourceModule?: string
    sourceEntityId?: string
    agentId?: string
    query?: string
    status?: string
    findingType?: string
    severity?: string
    sortBy?: string
    sortOrder?: string
    page?: number
    limit?: number
  }) => api.get<ApiResponse<AiExecutionFinding[]>>('/ai/findings', { params }).then(r => r.data),

  getFinding: (id: string) =>
    api.get<ApiResponse<AiExecutionFinding>>(`/ai/findings/${id}`).then(r => r.data),

  getFindingsByEntity: (entityType: string, entityId: string) =>
    api
      .get<ApiResponse<AiExecutionFinding[]>>(`/ai/findings/by-entity/${entityType}/${entityId}`)
      .then(r => r.data),

  getFindingsStats: () =>
    api.get<ApiResponse<AiFindingsStats>>('/ai/findings/stats').then(r => r.data),

  updateFindingStatus: (id: string, status: string) =>
    api
      .patch<ApiResponse<AiExecutionFinding>>(`/ai/findings/${id}/status`, { status })
      .then(r => r.data),

  exportFindings: (params?: { status?: string; agentId?: string; sourceModule?: string }) =>
    api
      .get<ApiResponse<AiExecutionFinding[]>>('/ai/findings/export', { params })
      .then(r => r.data),

  bulkUpdateFindingStatus: (ids: string[], status: string) =>
    api
      .post<ApiResponse<{ updated: number }>>('/ai/findings/bulk-status', { ids, status })
      .then(r => r.data),

  // Chat
  listChatThreads: (params?: { limit?: number; cursor?: string }) =>
    api
      .get<
        | { data: AiChatThread[]; nextCursor: string | null; hasMore: boolean }
        | { data: { data: AiChatThread[]; nextCursor: string | null; hasMore: boolean } }
      >('/ai-chat/threads', { params })
      .then(r => {
        const payload = r.data as Record<string, unknown>
        const innerData = payload['data']
        if (Array.isArray(innerData)) {
          return payload as unknown as {
            data: AiChatThread[]
            nextCursor: string | null
            hasMore: boolean
          }
        }
        return innerData as { data: AiChatThread[]; nextCursor: string | null; hasMore: boolean }
      }),

  createChatThread: (data: { connectorId?: string; model?: string; systemPrompt?: string }) =>
    api.post<ApiResponse<AiChatThread>>('/ai-chat/threads', data).then(r => r.data),

  getChatMessages: (
    threadId: string,
    params?: { limit?: number; cursor?: string; direction?: string }
  ) =>
    api
      .get<
        | { data: AiChatMessage[]; nextCursor: string | null; hasMore: boolean }
        | { data: { data: AiChatMessage[]; nextCursor: string | null; hasMore: boolean } }
      >(`/ai-chat/threads/${threadId}/messages`, { params })
      .then(r => {
        const payload = r.data as Record<string, unknown>
        // Handle double-wrapped response from proxy
        const innerData = payload['data']
        if (Array.isArray(innerData)) {
          return payload as unknown as {
            data: AiChatMessage[]
            nextCursor: string | null
            hasMore: boolean
          }
        }
        return innerData as { data: AiChatMessage[]; nextCursor: string | null; hasMore: boolean }
      }),

  sendChatMessage: (
    threadId: string,
    content: string,
    overrides?: { model?: string; connectorId?: string }
  ) =>
    api
      .post<ApiResponse<AiChatMessage>>(`/ai-chat/threads/${threadId}/messages`, {
        content,
        ...overrides,
      })
      .then(r => r.data),

  updateChatThread: (threadId: string, data: { connectorId?: string; model?: string }) =>
    api.patch<ApiResponse<AiChatThread>>(`/ai-chat/threads/${threadId}`, data).then(r => r.data),

  archiveChatThread: (threadId: string) =>
    api.delete<ApiResponse<void>>(`/ai-chat/threads/${threadId}`).then(r => r.data),

  // Job Runs
  getJobRuns: (params?: {
    page?: number
    limit?: number
    jobKey?: string
    agentId?: string
    status?: string
    sourceModule?: string
  }) => api.get<ApiResponse<AiJobRunSummary[]>>('/ai/job-runs', { params }).then(r => r.data),

  getJobHealth: () =>
    api
      .get<
        ApiResponse<{
          totalRuns: number
          completed: number
          failed: number
          avgDurationMs: number
          uniqueAgents: number
        }>
      >('/ai/job-health/summary')
      .then(r => r.data),

  // Schedules
  getSchedules: () => api.get<ApiResponse<AiAgentSchedule[]>>('/ai/schedules').then(r => r.data),

  updateSchedule: (id: string, data: UpdateScheduleInput) =>
    api.patch<ApiResponse<AiAgentSchedule>>(`/ai/schedules/${id}`, data).then(r => r.data),

  toggleSchedule: (id: string, enabled: boolean) =>
    api
      .post<ApiResponse<AiAgentSchedule>>(`/ai/schedules/${id}/toggle`, { enabled })
      .then(r => r.data),

  pauseSchedule: (id: string, paused: boolean) =>
    api
      .post<ApiResponse<AiAgentSchedule>>(`/ai/schedules/${id}/pause`, { paused })
      .then(r => r.data),

  runScheduleNow: (id: string) =>
    api.post<ApiResponse<AiAgentSchedule>>(`/ai/schedules/${id}/run-now`).then(r => r.data),

  resetSchedule: (id: string) =>
    api.post<ApiResponse<AiAgentSchedule>>(`/ai/schedules/${id}/reset`).then(r => r.data),
}
