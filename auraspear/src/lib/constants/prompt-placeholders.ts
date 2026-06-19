import { AiFeatureKey } from '@/enums'

/**
 * Maps each AI feature to the template placeholders available in its prompt.
 * These are injected by the backend before sending the prompt to the AI provider.
 *
 * - {{context}} replaces with the full entity data as a JSON string
 * - Individual field placeholders (e.g. {{alertTitle}}) are also replaced if present
 *
 * Field names are taken directly from each backend context-builder method.
 */
export const PROMPT_PLACEHOLDERS: Record<string, string[]> = {
  // ── Alerts (ai-alert-triage.service.ts → buildAlertContext) ──
  [AiFeatureKey.ALERT_SUMMARIZE]: [
    '{{context}}',
    '{{alertTitle}}',
    '{{alertDescription}}',
    '{{alertSeverity}}',
    '{{alertSource}}',
    '{{alertRule}}',
    '{{alertTimestamp}}',
    '{{alertRawData}}',
  ],
  [AiFeatureKey.ALERT_EXPLAIN_SEVERITY]: [
    '{{context}}',
    '{{alertTitle}}',
    '{{alertDescription}}',
    '{{alertSeverity}}',
    '{{alertSource}}',
    '{{alertRule}}',
    '{{alertTimestamp}}',
    '{{alertRawData}}',
  ],
  [AiFeatureKey.ALERT_FALSE_POSITIVE_SCORE]: [
    '{{context}}',
    '{{alertTitle}}',
    '{{alertDescription}}',
    '{{alertSeverity}}',
    '{{alertSource}}',
    '{{alertRule}}',
    '{{alertTimestamp}}',
    '{{alertRawData}}',
  ],
  [AiFeatureKey.ALERT_NEXT_ACTION]: [
    '{{context}}',
    '{{alertTitle}}',
    '{{alertDescription}}',
    '{{alertSeverity}}',
    '{{alertSource}}',
    '{{alertRule}}',
    '{{alertTimestamp}}',
    '{{alertRawData}}',
  ],

  // ── Cases (cases.utilities.ts → buildCaseAiContext) ──
  [AiFeatureKey.CASE_SUMMARIZE]: [
    '{{context}}',
    '{{caseTitle}}',
    '{{caseDescription}}',
    '{{caseSeverity}}',
    '{{caseStatus}}',
    '{{artifacts}}',
    '{{tasks}}',
    '{{timelineEvents}}',
  ],
  [AiFeatureKey.CASE_EXECUTIVE_SUMMARY]: [
    '{{context}}',
    '{{caseTitle}}',
    '{{caseDescription}}',
    '{{caseSeverity}}',
    '{{caseStatus}}',
    '{{artifacts}}',
    '{{tasks}}',
    '{{timelineEvents}}',
  ],
  [AiFeatureKey.CASE_TIMELINE]: [
    '{{context}}',
    '{{caseTitle}}',
    '{{caseDescription}}',
    '{{caseSeverity}}',
    '{{caseStatus}}',
    '{{artifacts}}',
    '{{tasks}}',
    '{{timelineEvents}}',
  ],
  [AiFeatureKey.CASE_NEXT_TASKS]: [
    '{{context}}',
    '{{caseTitle}}',
    '{{caseDescription}}',
    '{{caseSeverity}}',
    '{{caseStatus}}',
    '{{artifacts}}',
    '{{tasks}}',
    '{{timelineEvents}}',
  ],

  // ── Hunt (user-provided free text passed directly) ──
  [AiFeatureKey.HUNT_HYPOTHESIS]: ['{{context}}'],
  [AiFeatureKey.HUNT_NL_TO_QUERY]: ['{{context}}'],
  [AiFeatureKey.HUNT_RESULT_INTERPRET]: ['{{context}}'],

  // ── Intel (intel.utilities.ts → buildIocEnrichContext / buildAdvisoryContext) ──
  [AiFeatureKey.INTEL_IOC_ENRICH]: [
    '{{context}}',
    '{{iocType}}',
    '{{iocValue}}',
    '{{source}}',
    '{{tags}}',
    '{{firstSeen}}',
    '{{lastSeen}}',
  ],
  [AiFeatureKey.INTEL_ADVISORY_DRAFT]: ['{{context}}', '{{iocs}}'],

  // ── Detection Rules (ai-detection-copilot.service.ts) ──
  [AiFeatureKey.DETECTION_RULE_DRAFT]: ['{{context}}', '{{description}}'],
  [AiFeatureKey.DETECTION_TUNING]: [
    '{{context}}',
    '{{ruleName}}',
    '{{ruleDescription}}',
    '{{ruleType}}',
    '{{ruleStatus}}',
    '{{ruleSeverity}}',
    '{{ruleConditions}}',
    '{{ruleActions}}',
    '{{hitCount}}',
    '{{falsePositiveCount}}',
  ],

  // ── Reports (ai-report.service.ts → buildExecutiveReportContext) ──
  [AiFeatureKey.REPORT_DAILY_SUMMARY]: [
    '{{context}}',
    '{{alertsLast24h}}',
    '{{resolvedLast24h}}',
    '{{openCases}}',
    '{{date}}',
  ],
  [AiFeatureKey.REPORT_EXECUTIVE]: [
    '{{context}}',
    '{{timeRange}}',
    '{{periodDays}}',
    '{{totalAlerts}}',
    '{{resolvedAlerts}}',
    '{{openCases}}',
    '{{criticalAlerts}}',
    '{{generatedAt}}',
  ],

  // ── Dashboard (ai-dashboard.service.ts) ──
  [AiFeatureKey.DASHBOARD_ANOMALY]: [
    '{{context}}',
    '{{metric}}',
    '{{currentValue}}',
    '{{previousValue}}',
    '{{changePercent}}',
    '{{timeRange}}',
  ],

  // ── SOAR (ai-soar.service.ts → buildDraftContext) ──
  [AiFeatureKey.SOAR_PLAYBOOK_DRAFT]: ['{{context}}', '{{description}}', '{{existingPlaybooks}}'],

  // ── Agent Task ──
  [AiFeatureKey.AGENT_TASK]: ['{{context}}'],

  // ── Knowledge Base (ai-knowledge.service.ts) ──
  [AiFeatureKey.KNOWLEDGE_SEARCH]: ['{{query}}', '{{existingRunbooks}}'],
  [AiFeatureKey.KNOWLEDGE_GENERATE_RUNBOOK]: ['{{description}}'],
  [AiFeatureKey.KNOWLEDGE_SUMMARIZE_INCIDENT]: ['{{context}}'],

  // ── Entity Risk (ai-entity.service.ts → buildRiskContext) ──
  [AiFeatureKey.ENTITY_RISK_EXPLAIN]: [
    '{{context}}',
    '{{entityType}}',
    '{{entityValue}}',
    '{{entityDisplayName}}',
    '{{riskScore}}',
    '{{riskBreakdown}}',
    '{{relationCount}}',
    '{{firstSeen}}',
    '{{lastSeen}}',
    '{{metadata}}',
  ],

  // ── Normalization (ai-normalization.service.ts → buildVerifyContext) ──
  [AiFeatureKey.NORMALIZATION_VERIFY]: [
    '{{pipelineName}}',
    '{{pipelineConfig}}',
    '{{sampleEvents}}',
    '{{normalizedOutput}}',
  ],
}
