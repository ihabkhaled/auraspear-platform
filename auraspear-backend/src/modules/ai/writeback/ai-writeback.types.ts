import type { AiFindingType, IncidentActorType } from '../../../common/enums'

export interface AiWritebackParameters {
  tenantId: string
  sessionId: string
  agentId: string
  sourceModule: string
  sourceEntityId?: string
  aiResponse: AiWritebackResponse
  actionType: string
  /** True when the sessionId corresponds to a real AiAgentSession record (FK-linked to AiAgent). */
  hasRealSession?: boolean
  /** Schedule ID if triggered by a schedule */
  scheduleId?: string
  /** Duration of the AI execution in milliseconds */
  durationMs?: number
}

export interface AiWritebackResponse {
  result: string
  model: string
  provider: string
  confidence?: number
  tokensUsed: { input: number; output: number }
}

export interface ParsedAiFinding {
  findingType: AiFindingType
  title: string
  summary: string
  confidence: number | null
  severity: string | null
  recommendedAction: string | null
}

export interface SearchFindingsOptions {
  query?: string
  sourceModule?: string
  agentId?: string
  status?: string
  findingType?: string
  severity?: string
  sourceEntityId?: string
  confidenceMin?: number
  confidenceMax?: number
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortOrder?: string
  page?: number
  limit?: number
}

export interface SearchFindingsResult {
  data: unknown[]
  total: number
}

/** Data shape for bulk-creating AI execution findings */
export interface CreateFindingData {
  tenantId: string
  sessionId: string
  agentId: string
  sourceModule: string
  sourceEntityId: string | null
  findingType: string
  title: string
  summary: string
  confidenceScore: number | null
  severity: string | null
  recommendedAction: string | null
  status: string
}

/** Data shape for updating alert AI fields */
export interface AlertAiFieldsData {
  aiSummary: string
  aiConfidence: number | null
  aiSeveritySuggestion: string | null
  aiLastRunAt: Date
  aiLastExecutionId: string
  aiStatus: string
}

/** Data shape for creating an incident timeline entry */
export interface CreateIncidentTimelineData {
  incidentId: string
  event: string
  actorType: IncidentActorType
  actorName: string
}

/** Data shape for creating a case note */
export interface CreateCaseNoteData {
  caseId: string
  author: string
  body: string
}

/** Data shape for creating an AI job run summary */
export interface CreateJobRunSummaryData {
  tenantId: string
  jobId: string
  scheduleId: string | null
  jobKey: string
  agentId: string
  triggerType: string
  status: string
  startedAt: Date
  completedAt: Date
  durationMs: number | null
  providerKey: string
  modelKey: string
  tokensUsed: number
  findingsCount: number
  sourceModule: string
  sourceEntityId: string | null
  summaryText: string
  confidenceScore: number | null
}

/** Data shape for creating a notification */
export interface CreateNotificationData {
  tenantId: string
  type: string
  actorUserId: string | null
  recipientUserId: string
  title: string
  message: string
  entityType: string
  entityId: string
}
