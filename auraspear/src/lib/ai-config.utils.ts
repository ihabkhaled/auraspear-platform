import {
  AgentAutomationMode,
  AiApprovalLevel,
  AiFeatureKey,
  AiOutputFormat,
  AlertSeverity,
  BadgeVariant,
  AiTriggerMode,
  OsintAuthType,
  OsintSourceType,
} from '@/enums'
import { lookupBuiltinOsintDefaults } from '@/lib/osint.utils'
import type {
  AiFeatureConfig,
  AiPromptTemplate,
  OsintSourceConfig,
  TenantAgentConfig,
} from '@/types'

export function deriveAgentConfigState(config: TenantAgentConfig | null) {
  if (!config) {
    return {
      enabled: false,
      providerMode: 'inherit',
      model: '',
      temperature: '0.7',
      maxTokens: '4096',
      triggerMode: AiTriggerMode.MANUAL_ONLY,
      outputFormat: AiOutputFormat.MARKDOWN,
      presentationSkills: false,
      systemPrompt: '',
      promptSuffix: '',
      indexPatterns: '',
      tokensPerHourLimit: '10000',
      tokensPerDayLimit: '100000',
      tokensPerMonthLimit: '1000000',
      maxConcurrentRuns: '3',
    }
  }

  return {
    enabled: config.isEnabled,
    providerMode: config.providerMode,
    model: config.model ?? '',
    temperature: String(config.temperature),
    maxTokens: String(config.maxTokensPerCall),
    triggerMode: config.triggerMode as AiTriggerMode,
    outputFormat: config.outputFormat as AiOutputFormat,
    presentationSkills: (config.presentationSkills ?? []).length > 0,
    systemPrompt: config.systemPrompt ?? '',
    promptSuffix: config.promptSuffix ?? '',
    indexPatterns: (config.indexPatterns ?? []).join(', '),
    tokensPerHourLimit: String(config.tokensPerHour),
    tokensPerDayLimit: String(config.tokensPerDay),
    tokensPerMonthLimit: String(config.tokensPerMonth),
    maxConcurrentRuns: String(config.maxConcurrentRuns),
  }
}

export function deriveOsintSourceState(source: OsintSourceConfig | null) {
  if (!source) {
    const defaultType = OsintSourceType.VIRUSTOTAL
    const builtinDefaults = lookupBuiltinOsintDefaults(defaultType)
    return {
      sourceType: defaultType,
      name: '',
      isEnabled: true,
      apiKey: '',
      baseUrl: builtinDefaults?.baseUrl ?? '',
      authType: builtinDefaults?.authType ?? OsintAuthType.API_KEY_HEADER,
      headerName: builtinDefaults?.headerName ?? '',
      queryParam: builtinDefaults?.queryParamName ?? '',
      responsePath: builtinDefaults?.responsePath ?? '',
      requestMethod: builtinDefaults?.requestMethod ?? 'GET',
      timeout: '30000',
    }
  }

  return {
    sourceType: source.sourceType,
    name: source.name,
    isEnabled: source.isEnabled,
    apiKey: '',
    baseUrl: source.baseUrl ?? '',
    authType: source.authType,
    headerName: source.headerName ?? '',
    queryParam: source.queryParamName ?? '',
    responsePath: source.responsePath ?? '',
    requestMethod: source.requestMethod,
    timeout: String(source.timeout),
  }
}

export function derivePromptState(prompt: AiPromptTemplate | null) {
  return {
    taskType: prompt?.taskType ?? (AiFeatureKey.ALERT_SUMMARIZE as string),
    name: prompt?.name ?? '',
    content: prompt?.content ?? '',
  }
}

export function deriveFeatureState(feature: AiFeatureConfig | null) {
  return {
    enabled: feature?.enabled ?? false,
    preferredProvider: feature?.preferredProvider ?? null,
    maxTokens: feature?.maxTokens ?? 4096,
    approvalLevel: feature?.approvalLevel ?? (AiApprovalLevel.NONE as string),
    monthlyTokenBudget: feature?.monthlyTokenBudget ?? null,
  }
}

export function resolveAutomationBadgeVariant(
  automationMode: string,
  isEnabled: boolean
): BadgeVariant {
  if (!isEnabled) {
    return BadgeVariant.SECONDARY
  }

  switch (automationMode) {
    case AgentAutomationMode.AUTO_LOW_RISK:
    case AgentAutomationMode.AUTO_GOVERNED:
    case AgentAutomationMode.EVENT_DRIVEN:
    case AgentAutomationMode.ORCHESTRATOR_INVOKED:
      return BadgeVariant.SUCCESS
    case AgentAutomationMode.SUGGEST_ONLY:
    case AgentAutomationMode.DRAFT_ONLY:
    case AgentAutomationMode.ENRICH_ONLY:
    case AgentAutomationMode.ANALYST_INVOKED:
      return BadgeVariant.INFO
    case AgentAutomationMode.APPROVAL_REQUIRED:
    case AgentAutomationMode.SCHEDULED:
      return BadgeVariant.WARNING
    case AgentAutomationMode.DISABLED:
    case AgentAutomationMode.MANUAL_ONLY:
    default:
      return BadgeVariant.SECONDARY
  }
}

export function resolveAutomationBadgeLabel(
  automationMode: string,
  isEnabled: boolean,
  t: (key: string) => string
): string {
  if (!isEnabled) {
    return t('automationBadge.off')
  }

  switch (automationMode) {
    case AgentAutomationMode.AUTO_LOW_RISK:
    case AgentAutomationMode.AUTO_GOVERNED:
    case AgentAutomationMode.EVENT_DRIVEN:
    case AgentAutomationMode.ORCHESTRATOR_INVOKED:
      return t('automationBadge.auto')
    case AgentAutomationMode.SUGGEST_ONLY:
    case AgentAutomationMode.DRAFT_ONLY:
    case AgentAutomationMode.ENRICH_ONLY:
    case AgentAutomationMode.ANALYST_INVOKED:
      return t('automationBadge.suggestOnly')
    case AgentAutomationMode.APPROVAL_REQUIRED:
      return t('automationBadge.approvalRequired')
    case AgentAutomationMode.SCHEDULED:
      return t('automationBadge.scheduled')
    case AgentAutomationMode.DISABLED:
      return t('automationBadge.off')
    case AgentAutomationMode.MANUAL_ONLY:
      return t('automationBadge.manual')
    default:
      return t('automationBadge.off')
  }
}

export function deriveScheduleFormState(
  schedule: {
    cronExpression?: string
    timezone?: string
    executionMode?: string
    riskMode?: string
    approvalMode?: string
    maxConcurrency?: number
    providerPreference?: string | null
    modelPreference?: string | null
  } | null
) {
  return {
    cronExpression: schedule?.cronExpression ?? '0 */6 * * *',
    timezone: schedule?.timezone ?? 'UTC',
    executionMode: schedule?.executionMode ?? 'sequential',
    riskMode: schedule?.riskMode ?? 'normal',
    approvalMode: schedule?.approvalMode ?? 'auto',
    maxConcurrency: String(schedule?.maxConcurrency ?? 1),
    providerPreference: schedule?.providerPreference ?? '',
    modelPreference: schedule?.modelPreference ?? '',
  }
}

export function resolveFindingConfidenceVariant(score: number): BadgeVariant {
  if (score >= 80) return BadgeVariant.SUCCESS
  if (score >= 50) return BadgeVariant.WARNING
  return BadgeVariant.DESTRUCTIVE
}

export function resolveFindingSeverityVariant(severity: string): BadgeVariant {
  if (severity === AlertSeverity.CRITICAL || severity === AlertSeverity.HIGH) {
    return BadgeVariant.DESTRUCTIVE
  }
  if (severity === AlertSeverity.MEDIUM) return BadgeVariant.WARNING
  if (severity === AlertSeverity.LOW) return BadgeVariant.INFO
  return BadgeVariant.SECONDARY
}

export function resolveFindingStatusVariant(status: string): BadgeVariant {
  if (status === 'applied') return BadgeVariant.SUCCESS
  if (status === 'dismissed') return BadgeVariant.SECONDARY
  if (status === 'pending') return BadgeVariant.PENDING
  return BadgeVariant.OUTLINE
}
