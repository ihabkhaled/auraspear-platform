import {
  AgentAutomationMode,
  AgentRiskLevel,
  AiAgentPanelTab,
  AiAgentStatus,
  AiAgentTier,
  AiConnectorPreference,
  AiConnectorType,
  AiSessionTrigger,
} from '@/enums'
import type { AiAgentToolFormValues, AvailableAiConnector } from '@/types'

export const AI_AGENT_STATUS_LABEL_KEYS: Record<AiAgentStatus, string> = {
  [AiAgentStatus.ONLINE]: 'statusOnline',
  [AiAgentStatus.OFFLINE]: 'statusOffline',
  [AiAgentStatus.DEGRADED]: 'statusDegraded',
  [AiAgentStatus.MAINTENANCE]: 'statusMaintenance',
}

export const AI_AGENT_STATUS_CLASSES: Record<AiAgentStatus, string> = {
  [AiAgentStatus.ONLINE]: 'bg-status-success text-white',
  [AiAgentStatus.OFFLINE]: 'bg-muted text-muted-foreground',
  [AiAgentStatus.DEGRADED]: 'bg-status-warning text-white',
  [AiAgentStatus.MAINTENANCE]: 'bg-status-info text-white',
}

export const AI_AGENT_STATUS_DOT_CLASSES: Record<AiAgentStatus, string> = {
  [AiAgentStatus.ONLINE]: 'bg-status-success',
  [AiAgentStatus.OFFLINE]: 'bg-muted-foreground',
  [AiAgentStatus.DEGRADED]: 'bg-status-warning',
  [AiAgentStatus.MAINTENANCE]: 'bg-status-info',
}

export const AI_AGENT_TIER_LABEL_KEYS: Record<AiAgentTier, string> = {
  [AiAgentTier.L0]: 'tierL0',
  [AiAgentTier.L1]: 'tierL1',
  [AiAgentTier.L2]: 'tierL2',
  [AiAgentTier.L3]: 'tierL3',
}

export const AI_AGENT_TIER_CLASSES: Record<AiAgentTier, string> = {
  [AiAgentTier.L0]: 'bg-muted text-muted-foreground',
  [AiAgentTier.L1]: 'bg-severity-info text-white',
  [AiAgentTier.L2]: 'bg-severity-medium text-white',
  [AiAgentTier.L3]: 'bg-severity-critical text-white',
}

export const AI_AGENT_PANEL_TABS = [
  AiAgentPanelTab.OVERVIEW,
  AiAgentPanelTab.SOUL,
  AiAgentPanelTab.SESSIONS,
  AiAgentPanelTab.TOOLS,
] as const

export const AI_CONNECTOR_PREFERENCE_LABEL_KEYS: Record<AiConnectorPreference, string> = {
  [AiConnectorPreference.DEFAULT]: 'connectorDefault',
  [AiConnectorPreference.BEDROCK]: 'connectorBedrock',
  [AiConnectorPreference.LLM_APIS]: 'connectorLlmApis',
  [AiConnectorPreference.OPENCLAW_GATEWAY]: 'connectorOpenClawGateway',
}

export const AI_SESSION_CONNECTOR_LABELS: Record<string, string> = {
  bedrock: 'AWS Bedrock',
  llm_apis: 'LLM APIs',
  openclaw_gateway: 'OpenClaw Gateway',
  'rule-based': 'Rule-Based',
}

export const AI_AGENT_TOOL_DEFAULT_VALUES: AiAgentToolFormValues = {
  name: '',
  description: '',
  schema: '{\n  \n}',
}

export const AI_CONNECTOR_FALLBACK: AvailableAiConnector[] = [
  { key: 'default', label: 'Default (Auto)', type: AiConnectorType.SYSTEM, enabled: true },
]

export const AUTOMATION_MODE_LABEL_KEYS: Record<AgentAutomationMode, string> = {
  [AgentAutomationMode.DISABLED]: 'automationModes.disabled',
  [AgentAutomationMode.MANUAL_ONLY]: 'automationModes.manualOnly',
  [AgentAutomationMode.SUGGEST_ONLY]: 'automationModes.suggestOnly',
  [AgentAutomationMode.DRAFT_ONLY]: 'automationModes.draftOnly',
  [AgentAutomationMode.ENRICH_ONLY]: 'automationModes.enrichOnly',
  [AgentAutomationMode.APPROVAL_REQUIRED]: 'automationModes.approvalRequired',
  [AgentAutomationMode.AUTO_LOW_RISK]: 'automationModes.autoLowRisk',
  [AgentAutomationMode.AUTO_GOVERNED]: 'automationModes.autoGoverned',
  [AgentAutomationMode.SCHEDULED]: 'automationModes.scheduled',
  [AgentAutomationMode.EVENT_DRIVEN]: 'automationModes.eventDriven',
  [AgentAutomationMode.ANALYST_INVOKED]: 'automationModes.analystInvoked',
  [AgentAutomationMode.ORCHESTRATOR_INVOKED]: 'automationModes.orchestratorInvoked',
}

export const RISK_LEVEL_LABEL_KEYS: Record<AgentRiskLevel, string> = {
  [AgentRiskLevel.NONE]: 'riskLevels.none',
  [AgentRiskLevel.LOW]: 'riskLevels.low',
  [AgentRiskLevel.MEDIUM]: 'riskLevels.medium',
  [AgentRiskLevel.HIGH]: 'riskLevels.high',
  [AgentRiskLevel.CRITICAL]: 'riskLevels.critical',
}

export const AI_SESSION_TRIGGER_LABEL_KEYS: Record<AiSessionTrigger, string> = {
  [AiSessionTrigger.USER]: 'sessionTriggerUser',
  [AiSessionTrigger.SYSTEM]: 'sessionTriggerSystem',
  [AiSessionTrigger.SCHEDULED]: 'sessionTriggerScheduled',
  [AiSessionTrigger.EVENT]: 'sessionTriggerEvent',
}

export const AI_SESSION_TRIGGER_VARIANTS: Record<AiSessionTrigger, string> = {
  [AiSessionTrigger.USER]: 'default',
  [AiSessionTrigger.SYSTEM]: 'secondary',
  [AiSessionTrigger.SCHEDULED]: 'info',
  [AiSessionTrigger.EVENT]: 'warning',
}
