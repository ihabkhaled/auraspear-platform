import { AGENT_DEFAULTS_MAP, AI_DEFAULT_PROVIDER_KEY } from './agent-config.constants'
import { AiAgentId, TokenResetPeriod } from '../../common/enums'
import { nowDate } from '../../common/utils/date-time.utility'
import type {
  AgentConfigWithDefaults,
  OsintSourceRedacted,
  TenantAgentConfigRecord,
  OsintSourceConfigRecord,
} from './agent-config.types'

export function buildAgentConfigWithDefaults(
  agentId: AiAgentId,
  record: TenantAgentConfigRecord | null
): AgentConfigWithDefaults {
  const defaults = AGENT_DEFAULTS_MAP.get(agentId)

  if (!defaults) {
    throw new Error(`Unknown agent ID: ${agentId}`)
  }

  if (!record) {
    return {
      agentId,
      displayName: defaults.displayName,
      description: defaults.description,
      isEnabled: false,
      providerMode: AI_DEFAULT_PROVIDER_KEY,
      model: null,
      temperature: defaults.temperature,
      maxTokensPerCall: defaults.maxTokensPerCall,
      systemPrompt: null,
      promptSuffix: null,
      indexPatterns: [],
      tokensPerHour: 50_000,
      tokensPerDay: 500_000,
      tokensPerMonth: 5_000_000,
      tokensUsedHour: 0,
      tokensUsedDay: 0,
      tokensUsedMonth: 0,
      maxConcurrentRuns: 3,
      triggerMode: defaults.triggerMode,
      triggerConfig: {},
      osintSources: [],
      outputFormat: defaults.outputFormat,
      presentationSkills: defaults.presentationSkills,
      lastResetHour: null,
      lastResetDay: null,
      lastResetMonth: null,
      hasCustomConfig: false,
    }
  }

  return {
    agentId: record.agentId,
    displayName: defaults.displayName,
    description: defaults.description,
    isEnabled: record.isEnabled,
    providerMode: record.providerMode,
    model: record.model,
    temperature: record.temperature,
    maxTokensPerCall: record.maxTokensPerCall,
    systemPrompt: record.systemPrompt,
    promptSuffix: record.promptSuffix,
    indexPatterns: record.indexPatterns,
    tokensPerHour: record.tokensPerHour,
    tokensPerDay: record.tokensPerDay,
    tokensPerMonth: record.tokensPerMonth,
    tokensUsedHour: record.tokensUsedHour,
    tokensUsedDay: record.tokensUsedDay,
    tokensUsedMonth: record.tokensUsedMonth,
    maxConcurrentRuns: record.maxConcurrentRuns,
    triggerMode: record.triggerMode,
    triggerConfig: record.triggerConfig,
    osintSources: record.osintSources,
    outputFormat: record.outputFormat,
    presentationSkills: record.presentationSkills,
    lastResetHour: record.lastResetHour,
    lastResetDay: record.lastResetDay,
    lastResetMonth: record.lastResetMonth,
    hasCustomConfig: true,
  }
}

export function redactOsintSource(source: OsintSourceConfigRecord): OsintSourceRedacted {
  return {
    id: source.id,
    tenantId: source.tenantId,
    sourceType: source.sourceType,
    name: source.name,
    isEnabled: source.isEnabled,
    hasApiKey: source.encryptedApiKey !== null && source.encryptedApiKey.length > 0,
    baseUrl: source.baseUrl,
    authType: source.authType,
    headerName: source.headerName,
    queryParamName: source.queryParamName,
    responsePath: source.responsePath,
    requestMethod: source.requestMethod,
    timeout: source.timeout,
    lastTestAt: source.lastTestAt,
    lastTestOk: source.lastTestOk,
    lastError: source.lastError,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  }
}

export function buildTokenResetData(period: TokenResetPeriod): Record<string, unknown> {
  const now = nowDate()

  switch (period) {
    case TokenResetPeriod.HOUR:
      return { tokensUsedHour: 0, lastResetHour: now }
    case TokenResetPeriod.DAY:
      return { tokensUsedDay: 0, lastResetDay: now }
    case TokenResetPeriod.MONTH:
      return { tokensUsedMonth: 0, lastResetMonth: now }
  }
}

export function isValidAgentId(agentId: string): boolean {
  return Object.values(AiAgentId).includes(agentId as AiAgentId)
}

/* ---------------------------------------------------------------- */
/* OSINT SOURCE UPDATE DATA BUILDING                                 */
/* ---------------------------------------------------------------- */

export function buildOsintSourceUpdateData(
  dto: Record<string, unknown>,
  encryptedKey: string | null
): Record<string, unknown> {
  const updateData: Record<string, unknown> = { ...dto }
  delete updateData.apiKey

  if (encryptedKey !== null) {
    updateData.encryptedApiKey = encryptedKey
  }

  return updateData
}
