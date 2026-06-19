import api from '@/lib/api'
import type {
  AiCaseCopilotResult,
  ApiResponse,
  Case,
  CaseArtifact,
  CaseComment,
  CaseSearchParams,
  CaseTask,
  CreateCaseCommentInput,
  CreateCaseInput,
  MentionableUser,
  UpdateCaseCommentInput,
  UpdateCaseInput,
} from '@/types'

export const caseService = {
  getCases: (params?: CaseSearchParams) =>
    api.get<ApiResponse<Case[]>>('/cases', { params }).then(r => r.data),

  getCase: (id: string) => api.get<ApiResponse<Case>>(`/cases/${id}`).then(r => r.data),

  createCase: (data: CreateCaseInput) =>
    api.post<ApiResponse<Case>>('/cases', data).then(r => r.data),

  updateCase: (id: string, data: UpdateCaseInput) =>
    api.patch<ApiResponse<Case>>(`/cases/${id}`, data).then(r => r.data),

  // Tasks
  createTask: (caseId: string, data: { title: string; assignee?: string }) =>
    api.post<{ data: CaseTask }>(`/cases/${caseId}/tasks`, data).then(r => r.data.data),

  updateTask: (
    caseId: string,
    taskId: string,
    data: { title?: string; status?: string; assignee?: string | null }
  ) =>
    api.patch<{ data: CaseTask }>(`/cases/${caseId}/tasks/${taskId}`, data).then(r => r.data.data),

  deleteTask: (caseId: string, taskId: string) =>
    api.delete<{ deleted: boolean }>(`/cases/${caseId}/tasks/${taskId}`).then(r => r.data),

  // Artifacts
  createArtifact: (caseId: string, data: { type: string; value: string; source?: string }) =>
    api.post<{ data: CaseArtifact }>(`/cases/${caseId}/artifacts`, data).then(r => r.data.data),

  deleteArtifact: (caseId: string, artifactId: string) =>
    api.delete<{ deleted: boolean }>(`/cases/${caseId}/artifacts/${artifactId}`).then(r => r.data),

  // Comments
  getComments: (caseId: string, params?: { page?: number; limit?: number }) =>
    api.get<ApiResponse<CaseComment[]>>(`/cases/${caseId}/comments`, { params }).then(r => r.data),

  createComment: (caseId: string, data: CreateCaseCommentInput) =>
    api.post<{ data: CaseComment }>(`/cases/${caseId}/comments`, data).then(r => r.data.data),

  updateComment: (caseId: string, commentId: string, data: UpdateCaseCommentInput) =>
    api
      .patch<{ data: CaseComment }>(`/cases/${caseId}/comments/${commentId}`, data)
      .then(r => r.data.data),

  deleteComment: (caseId: string, commentId: string) =>
    api.delete<{ deleted: boolean }>(`/cases/${caseId}/comments/${commentId}`).then(r => r.data),

  searchMentionableUsers: (caseId: string, query: string, limit = 10) =>
    api
      .get<{ data: MentionableUser[] }>(`/cases/${caseId}/comments/mentionable-users`, {
        params: { query, limit },
      })
      .then(r => r.data.data),

  // AI Case Copilot
  aiSummarize: (caseId: string, connector?: string) =>
    api
      .post<ApiResponse<AiCaseCopilotResult>>(`/cases/${caseId}/ai/summarize`, { connector })
      .then(r => r.data.data),

  aiExecutiveSummary: (caseId: string, connector?: string) =>
    api
      .post<ApiResponse<AiCaseCopilotResult>>(`/cases/${caseId}/ai/executive-summary`, {
        connector,
      })
      .then(r => r.data.data),

  aiTimeline: (caseId: string, connector?: string) =>
    api
      .post<ApiResponse<AiCaseCopilotResult>>(`/cases/${caseId}/ai/timeline`, { connector })
      .then(r => r.data.data),

  aiNextTasks: (caseId: string, connector?: string) =>
    api
      .post<ApiResponse<AiCaseCopilotResult>>(`/cases/${caseId}/ai/next-tasks`, { connector })
      .then(r => r.data.data),
}
