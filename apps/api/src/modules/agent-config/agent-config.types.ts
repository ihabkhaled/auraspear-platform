import type {
  AiOutputFormat,
  AiTriggerMode,
  OsintAuthType,
  OsintSourceType,
} from '../../common/enums'
import type { PaginatedResponse } from '../../common/interfaces/pagination.interface'
import type { TenantAgentConfig, OsintSourceConfig, AiApprovalRequest } from '@prisma/client'

export type TenantAgentConfigRecord = TenantAgentConfig

export type OsintSourceConfigRecord = OsintSourceConfig

export type AiApprovalRequestRecord = AiApprovalRequest

export type PaginatedApprovals = PaginatedResponse<AiApprovalRequestRecord>

export interface AgentDefaultConfig {
  displayName: string
  description: string
  temperature: number
  maxTokensPerCall: number
  triggerMode: AiTriggerMode
  outputFormat: AiOutputFormat
  presentationSkills: string[]
}

export interface AgentConfigWithDefaults {
  agentId: string
  displayName: string
  description: string
  isEnabled: boolean
  providerMode: string
  model: string | null
  temperature: number
  maxTokensPerCall: number
  systemPrompt: string | null
  promptSuffix: string | null
  indexPatterns: string[]
  tokensPerHour: number
  tokensPerDay: number
  tokensPerMonth: number
  tokensUsedHour: number
  tokensUsedDay: number
  tokensUsedMonth: number
  maxConcurrentRuns: number
  triggerMode: string
  triggerConfig: unknown
  osintSources: unknown
  outputFormat: string
  presentationSkills: string[]
  lastResetHour: Date | null
  lastResetDay: Date | null
  lastResetMonth: Date | null
  hasCustomConfig: boolean
}

export interface OsintSourceRedacted {
  id: string
  tenantId: string
  sourceType: string
  name: string
  isEnabled: boolean
  hasApiKey: boolean
  baseUrl: string | null
  authType: string
  headerName: string | null
  queryParamName: string | null
  responsePath: string | null
  requestMethod: string
  timeout: number
  lastTestAt: Date | null
  lastTestOk: boolean | null
  lastError: string | null
  createdAt: Date
  updatedAt: Date
}

export interface BuiltinOsintSource {
  sourceType: OsintSourceType
  name: string
  baseUrl: string
  authType: OsintAuthType
  headerName?: string
  queryParamName?: string
  responsePath: string
  requestMethod: string
  supportedIocTypes?: string[]
}

export interface ResolvedProvider {
  mode: string
  connectorId: string | null
  model: string | null
}

export interface OsintTestResult {
  success: boolean
  statusCode: number | null
  responseTime: number | null
  error: string | null
  messageKey: string | null
}

export interface ApprovalResolveInput {
  status: string
  comment: string | null
  reviewedBy: string
}
