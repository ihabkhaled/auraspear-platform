import { AiFindingStatus, AiFindingType } from '../../../common/enums'

/** Map of allowed sortBy values to their SQL column names */
export const FINDINGS_SORT_COLUMN_MAP: Record<string, string> = {
  createdAt: 'created_at',
  findingType: 'finding_type',
  severity: 'severity',
  confidenceScore: 'confidence_score',
  status: 'status',
  agentId: 'agent_id',
  title: 'title',
  sourceModule: 'source_module',
}

export const AI_SUMMARY_MAX_LENGTH = 10000
export const AI_NOTIFICATION_MESSAGE_MAX_LENGTH = 500
export const SEVERITY_PATTERN = /\b(critical|high|medium|low|info)\b/i

/** Valid status transitions: proposed -> applied, proposed -> dismissed, failed -> dismissed */
export const VALID_FINDING_TRANSITIONS = new Map<string, Set<string>>([
  [AiFindingStatus.PROPOSED, new Set([AiFindingStatus.APPLIED, AiFindingStatus.DISMISSED])],
  [AiFindingStatus.FAILED, new Set([AiFindingStatus.DISMISSED])],
])

export const ACTION_TYPE_TO_FINDING_TYPE = new Map<string, AiFindingType>([
  ['triage', AiFindingType.TRIAGE],
  ['summarize', AiFindingType.SUMMARY],
  ['severity_recommendation', AiFindingType.SEVERITY_RECOMMENDATION],
  ['escalation_recommendation', AiFindingType.ESCALATION_RECOMMENDATION],
  ['investigate', AiFindingType.INVESTIGATION_STEP],
  ['entity_risk', AiFindingType.ENTITY_RISK_SIGNAL],
  ['correlate', AiFindingType.CORRELATION_CANDIDATE],
  ['vulnerability_priority', AiFindingType.VULNERABILITY_PRIORITY],
  ['cloud_posture', AiFindingType.CLOUD_POSTURE_FINDING],
  ['rule_recommendation', AiFindingType.RULE_RECOMMENDATION],
  ['report_insight', AiFindingType.REPORT_INSIGHT],
])
