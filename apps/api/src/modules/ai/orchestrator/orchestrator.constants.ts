import { AgentAutomationMode, AgentRiskLevel } from '../../../common/enums'

/** Automation modes that are fully disabled and must block dispatch. */
export const DISABLED_MODES = new Set<AgentAutomationMode>([AgentAutomationMode.DISABLED])

/** Automation modes that always require analyst approval before execution. */
export const APPROVAL_REQUIRED_MODES = new Set<AgentAutomationMode>([
  AgentAutomationMode.APPROVAL_REQUIRED,
  AgentAutomationMode.AUTO_GOVERNED,
])

/** Risk levels at or above which auto-low-risk mode requires approval. */
export const HIGH_RISK_LEVELS = new Set<AgentRiskLevel>([
  AgentRiskLevel.MEDIUM,
  AgentRiskLevel.HIGH,
  AgentRiskLevel.CRITICAL,
])
